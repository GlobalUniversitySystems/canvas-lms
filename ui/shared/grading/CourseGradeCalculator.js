/*
 * Copyright (C) 2016 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import _ from 'underscore'
import round from 'round'
import AssignmentGroupGradeCalculator from './AssignmentGroupGradeCalculator'
import {
  bigSum,
  sum,
  sumBy,
  toNumber,
  weightedPercent
} from './GradeCalculationHelper'

// For "Points (2026)" courses, a non-mandatory assignment group whose own
// grade (on the 0-10 point scale) falls below this threshold is excluded
// entirely from the course total grade calculation. It neither contributes
// score/possible/weight nor triggers automatic course failure -- that is
// reserved for mandatory groups.
const NON_MANDATORY_GROUP_MIN_GRADE_BBA = 5.3

function excludeFailingNonMandatoryGroups(groupGrades, options) {
  if (options.gradeTypeName !== 'Points (2026)') {
    return groupGrades
  }

  return groupGrades.filter(grade => {
    if (grade.mandatory || !grade.possible) {
      return true
    }

    const groupGradePoints = (grade.score / grade.possible) * 10
    return groupGradePoints >= NON_MANDATORY_GROUP_MIN_GRADE_BBA
  })
}

function combineAssignmentGroupGrades(assignmentGroupGrades, includeUngraded, options) {
  const mappedAssignmentGroupGrades = _.map(assignmentGroupGrades, assignmentGroupGrade => {
    const gradeVersion = includeUngraded ? assignmentGroupGrade.final : assignmentGroupGrade.current
    return {...gradeVersion, weight: assignmentGroupGrade.assignmentGroupWeight, mandatory: assignmentGroupGrade.mandatory}
  })
  const scopedAssignmentGroupGrades = excludeFailingNonMandatoryGroups(
    mappedAssignmentGroupGrades,
    options
  )

  if (options.weightAssignmentGroups) {
    const relevantGroupGrades = scopedAssignmentGroupGrades.filter(grade => grade.possible)
    const fullWeight = sumBy(relevantGroupGrades, 'weight')
    const hasFailed = !!relevantGroupGrades.find(elem => {
      if (options.gradeTypeName === 'Competency') {
        if (options.isModuleCategory === true) {
          if (options.componentType === 'Enhancing') {
            return false
          }
        }
      }

      if (options.gradeTypeName === 'Points (2026)' || options.gradeTypeName === 'Points MBM') {
        if (!elem.mandatory) {
          return false
        }
      }

      const componentTotalScorePoints = +(elem.score / elem.possible * 10).toFixed(1)
      const defaultLegacyFailPoint = 5.4

      let failPoint = defaultLegacyFailPoint

      if (options.gradeTypeName === 'Competency') {
        if (options.isModuleCategory === false) {
          let developing = options.gradePassingInfo['Developing']
          if (developing !== undefined) {
            failPoint = developing['end']
          }
        }
      }

      if (options.gradeTypeName === 'Points (2026)' || options.gradeTypeName === 'Points MBM') {
        failPoint = options.passingGradeBBA
      }

      if (options.gradeTypeName === 'Points (2026)' || options.gradeTypeName === 'Points MBM') {
        return elem.weight > 0 && componentTotalScorePoints < failPoint
      } else {
        return elem.weight > 0 && componentTotalScorePoints <= failPoint
      }
    })

    const markEnhancingRed = !!relevantGroupGrades.find(elem => {
      if (options.gradeTypeName === 'Competency') {
        if (options.isModuleCategory === true) {
          if (options.componentType === 'Enhancing') {
            let developing = options.gradePassingInfo['Developing']
            if (developing !== undefined) {
              const componentTotalScorePoints = +(elem.score / elem.possible * 10).toFixed(1)

              return elem.weight > 0 && componentTotalScorePoints <= developing['end']
            }
          }
        }
      }

      return false
    })

    let finalGrade = bigSum(_.map(relevantGroupGrades, weightedPercent))
    if (fullWeight === 0 || hasFailed) {
      finalGrade = null
    } else if (fullWeight < 100) {
        finalGrade = toNumber(weightedPercent({score: finalGrade, possible: fullWeight, weight: 100}))
    }

    const submissionCount = sumBy(relevantGroupGrades, 'submission_count')
    const possible = submissionCount > 0 || includeUngraded ? 100 : 0
    let score = finalGrade && round(finalGrade, 2)
    score = isNaN(score) ? null : score

    return {score, possible}
  }

  return {
    score: sumBy(scopedAssignmentGroupGrades, 'score'),
    possible: sumBy(scopedAssignmentGroupGrades, 'possible')
  }
}

function combineGradingPeriodGrades(gradingPeriodGradesByPeriodId, includeUngraded) {
  let scopedGradingPeriodGrades = _.map(gradingPeriodGradesByPeriodId, gradingPeriodGrade => {
    const gradeVersion = includeUngraded ? gradingPeriodGrade.final : gradingPeriodGrade.current
    return {...gradeVersion, weight: gradingPeriodGrade.gradingPeriodWeight}
  })

  if (!includeUngraded) {
    scopedGradingPeriodGrades = _.filter(scopedGradingPeriodGrades, 'possible')
  }

  const scoreSum = bigSum(_.map(scopedGradingPeriodGrades, weightedPercent))
  const totalWeight = sumBy(scopedGradingPeriodGrades, 'weight')
  const totalScore =
    totalWeight === 0 ? 0 : toNumber(scoreSum.times(100).div(Math.min(totalWeight, 100)))

  return {
    score: round(totalScore, 2),
    possible: 100
  }
}

function divideGroupByGradingPeriods(assignmentGroup, effectiveDueDates) {
  // When using weighted grading periods, assignment groups must not contain assignments due in different grading
  // periods. This allows for calculated assignment group grades in closed grading periods to be accidentally
  // changed if a related assignment is considered to be in an open grading period.
  //
  // To avoid this, assignment groups meeting this criteria are "divided" (duplicated) in a way where each
  // instance of the assignment group includes assignments only from one grading period.
  const assignmentsByGradingPeriodId = _.groupBy(
    assignmentGroup.assignments,
    assignment => effectiveDueDates[assignment.id].grading_period_id
  )
  return _.map(assignmentsByGradingPeriodId, assignments => ({...assignmentGroup, assignments}))
}

function extractPeriodBasedAssignmentGroups(assignmentGroups, effectiveDueDates) {
  return _.reduce(
    assignmentGroups,
    (periodBasedGroups, assignmentGroup) => {
      const assignedAssignments = _.filter(
        assignmentGroup.assignments,
        assignment => effectiveDueDates[assignment.id]
      )
      if (assignedAssignments.length > 0) {
        const groupWithAssignedAssignments = {...assignmentGroup, assignments: assignedAssignments}
        return [
          ...periodBasedGroups,
          ...divideGroupByGradingPeriods(groupWithAssignedAssignments, effectiveDueDates)
        ]
      }
      return periodBasedGroups
    },
    []
  )
}

function recombinePeriodBasedAssignmentGroupGrades(grades) {
  const map = {}

  for (let g = 0; g < grades.length; g++) {
    const grade = grades[g]
    const previousGrade = map[grade.assignmentGroupId]

    if (previousGrade) {
      map[grade.assignmentGroupId] = {
        ...previousGrade,
        current: {
          submission_count: previousGrade.current.submission_count + grade.current.submission_count,
          submissions: [...previousGrade.current.submissions, ...grade.current.submissions],
          score: sum([previousGrade.current.score, grade.current.score]),
          possible: sum([previousGrade.current.possible, grade.current.possible])
        },
        final: {
          submission_count: previousGrade.final.submission_count + grade.final.submission_count,
          submissions: [...previousGrade.final.submissions, ...grade.final.submissions],
          score: sum([previousGrade.final.score, grade.final.score]),
          possible: sum([previousGrade.final.possible, grade.final.possible])
        }
      }
    } else {
      map[grade.assignmentGroupId] = grade
    }
  }

  return map
}

function calculateWithGradingPeriods(
  submissions,
  assignmentGroups,
  gradingPeriods,
  effectiveDueDates,
  options
) {
  const periodBasedGroups = extractPeriodBasedAssignmentGroups(assignmentGroups, effectiveDueDates)

  const assignmentGroupsByGradingPeriodId = _.groupBy(periodBasedGroups, assignmentGroup => {
    const assignmentId = assignmentGroup.assignments[0].id
    return effectiveDueDates[assignmentId].grading_period_id
  })

  const gradingPeriodsById = _.keyBy(gradingPeriods, 'id')
  const gradingPeriodGradesByPeriodId = {}
  const periodBasedAssignmentGroupGrades = []

  for (let gp = 0; gp < gradingPeriods.length; gp++) {
    const groupGrades = {}
    const gradingPeriod = gradingPeriods[gp]

    const assignmentGroupsInPeriod = assignmentGroupsByGradingPeriodId[gradingPeriod.id] || []
    for (let ag = 0; ag < assignmentGroupsInPeriod.length; ag++) {
      const assignmentGroup = assignmentGroupsInPeriod[ag]

      groupGrades[assignmentGroup.id] = AssignmentGroupGradeCalculator.calculate(
        submissions,
        assignmentGroup,
        options.ignoreUnpostedAnonymous
      )
      periodBasedAssignmentGroupGrades.push(groupGrades[assignmentGroup.id])
    }

    const groupGradesList = _.values(groupGrades)

    gradingPeriodGradesByPeriodId[gradingPeriod.id] = {
      gradingPeriodId: gradingPeriod.id,
      gradingPeriodWeight: gradingPeriodsById[gradingPeriod.id].weight || 0,
      assignmentGroups: groupGrades,
      current: combineAssignmentGroupGrades(groupGradesList, false, options),
      final: combineAssignmentGroupGrades(groupGradesList, true, options),
      scoreUnit: options.weightAssignmentGroups ? 'percentage' : 'points'
    }
  }

  if (options.weightGradingPeriods) {
    return {
      assignmentGroups: recombinePeriodBasedAssignmentGroupGrades(periodBasedAssignmentGroupGrades),
      gradingPeriods: gradingPeriodGradesByPeriodId,
      current: combineGradingPeriodGrades(gradingPeriodGradesByPeriodId, false, options),
      final: combineGradingPeriodGrades(gradingPeriodGradesByPeriodId, true, options),
      scoreUnit: 'percentage'
    }
  }

  const allAssignmentGroupGrades = _.map(assignmentGroups, assignmentGroup =>
    AssignmentGroupGradeCalculator.calculate(
      submissions,
      assignmentGroup,
      options.ignoreUnpostedAnonymous
    )
  )

  return {
    assignmentGroups: _.keyBy(allAssignmentGroupGrades, grade => grade.assignmentGroupId),
    gradingPeriods: gradingPeriodGradesByPeriodId,
    current: combineAssignmentGroupGrades(allAssignmentGroupGrades, false, options),
    final: combineAssignmentGroupGrades(allAssignmentGroupGrades, true, options),
    scoreUnit: options.weightAssignmentGroups ? 'percentage' : 'points'
  }
}

function calculateWithoutGradingPeriods(submissions, assignmentGroups, options) {
  const assignmentGroupGrades = _.map(assignmentGroups, assignmentGroup =>
    AssignmentGroupGradeCalculator.calculate(
      submissions,
      assignmentGroup,
      options.ignoreUnpostedAnonymous
    )
  )

  return {
    assignmentGroups: _.keyBy(assignmentGroupGrades, grade => grade.assignmentGroupId),
    current: combineAssignmentGroupGrades(assignmentGroupGrades, false, options),
    final: combineAssignmentGroupGrades(assignmentGroupGrades, true, options),
    scoreUnit: options.weightAssignmentGroups ? 'percentage' : 'points'
  }
}

// Each submission requires the following properties:
// * score: number
// * points_possible: non-negative integer
// * assignment_id: Canvas id
// * assignment_group_id: Canvas id
// * excused: boolean
//
// Ungraded submissions will have a score of `null`.
//
// Each assignment group requires the following properties:
// * id: Canvas id
// * rules: object *see below
// * group_weight: non-negative number
// * assignments: array *see below
//
// `rules` has the following properties:
// * drop_lowest: non-negative integer
// * drop_highest: non-negative integer
// * never_drop: [array of assignment ids]
//
// `assignments` is an array of objects with the following properties:
// * id: Canvas id
// * points_possible: non-negative number
// * submission_types: [array of strings]
// * anonymize_students: boolean
//
// The weighting scheme is one of [`percent`, `points`]
//
// When weightingScheme is `percent`, assignment group weights are used.
// Otherwise, no weighting is applied.
//
// Grading period set and effective due dates are optional, but must be used
// together.
//
// `gradingPeriodSet` is an object with at least the following shape:
// * gradingPeriods: [array of grading periods *see below]
// * weight: non-negative number
//
// Each grading period requires the following properties:
// * id: Canvas id
// * weight: non-negative number
//
// `effectiveDueDates` is an object with at least the following shape:
// {
//   <assignment id (Canvas id)>: {
//     grading_period_id: <grading period id (Canvas id)>
//   }
// }
//
// `effectiveDueDates` should generally include an assignment id for most/all
// assignments in use for the course and student. The structure above is the
// "user-scoped" form of effective due dates, which includes only the
// necessary data to perform a grade calculation. Effective due date entries
// would otherwise include more information about a student's relationship
// with an assignment and related grading periods.
//
// Grades minimally have the following shape:
// {
//   score: number|null
//   possible: number|null
// }
//
// AssignmentGroup Grade maps have the following shape:
// {
//   <assignment group id (Canvas id)>: <AssignmentGroup Grade Set *see below>
// }
//
// GradingPeriod Grade Sets have the following shape:
// {
//   gradingPeriodId: <Canvas id>
//   gradingPeriodWeight: number
//   assignmentGroups: <AssignmentGroup Grade map>
//   current: <AssignmentGroup Grade *see below>
//   final: <AssignmentGroup Grade *see below>
//   scoreUnit: 'points'|'percent'
// }
//
// GradingPeriod Grade maps have the following shape:
// {
//   <grading period id (Canvas id)>: <GradingPeriod Grade Set *see above>
// }
//
// Each grading period will have a map for assignment group grades, keyed to
// the id of assignment groups graded within the grading period. Not every
// call to `calculate` will include grading period grades, as some courses do
// not use grading periods.
//
// An AssignmentGroup Grade Set is the returned result from the
// AssignmentGroupGradeCalculator.calculate function.
//
// Return value is a Course Grade Set.
// A Course Grade Set has the following shape:
// {
//   assignmentGroups: <AssignmentGroup Grade map *see above>
//   gradingPeriods: <GradingPeriod Grade map *see above>
//   current: <AssignmentGroup Grade *see above>
//   final: <AssignmentGroup Grade *see above>
//   scoreUnit: 'points'|'percent'
// }
function calculate(
  submissions,
  assignmentGroups,
  weightingScheme,
  ignoreUnpostedAnonymous,
  gradingPeriodSet,
  effectiveDueDates
) {
  const agroupkeys = Object.keys(assignmentGroups)
  let gradePassingInfo = {}
  let componentType = ''
  let gradeTypeName = ''
  let isModuleCategory = false
  let passingGradeBBA
  if (agroupkeys.length > 0) {
    gradePassingInfo = assignmentGroups[agroupkeys[0]].grade_passing_info
    componentType = assignmentGroups[agroupkeys[0]].component_type
    gradeTypeName = assignmentGroups[agroupkeys[0]].grade_type_name
    isModuleCategory = assignmentGroups[agroupkeys[0]].is_module_category
    passingGradeBBA = assignmentGroups[agroupkeys[0]].passing_grade
  }

  const options = {
    gradePassingInfo: gradePassingInfo,
    componentType: componentType,
    gradeTypeName: gradeTypeName,
    isModuleCategory: isModuleCategory,
    weightGradingPeriods: gradingPeriodSet && !!gradingPeriodSet.weighted,
    weightAssignmentGroups: weightingScheme === 'percent',
    passingGradeBBA: passingGradeBBA,
    ignoreUnpostedAnonymous
  }

  if (gradingPeriodSet && effectiveDueDates) {
    return calculateWithGradingPeriods(
      submissions,
      assignmentGroups,
      gradingPeriodSet.gradingPeriods,
      effectiveDueDates,
      options
    )
  }

  return calculateWithoutGradingPeriods(submissions, assignmentGroups, options)
}

export default {
  calculate
}
