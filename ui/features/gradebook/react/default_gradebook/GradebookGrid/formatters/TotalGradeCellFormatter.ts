/*
 * Copyright (C) 2017 - present Instructure, Inc.
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

import $ from 'jquery'
import _ from 'underscore'
import round from 'round'
import {useScope as useI18nScope} from '@canvas/i18n'
import {scoreToGrade} from '@canvas/grading/GradingSchemeHelper'
import {scoreToPercentage, scoreToPoints} from '@canvas/grading/GradeCalculationHelper'
import htmlEscape from 'html-escape'
import '@canvas/jquery/jquery.instructure_misc_helpers' // $.toSentence

const I18n = useI18nScope('gradebook')

function getGradePercentage(score, pointsPossible) {
  const grade = scoreToPercentage(score, pointsPossible)
  return round(grade, round.DEFAULT)
}

function getGradePoints(score) {
  const grade = scoreToPoints(score)
  return round(grade, 1)
}

function buildHiddenAssignmentsWarning() {
  return {
    icon: 'icon-off',
    warningText: I18n.t(
      "This grade differs from the student's view of the grade because some assignment grades are not yet posted"
    )
  }
}

function buildInvalidAssignmentGroupsWarning(invalidAssignmentGroups) {
  const names = invalidAssignmentGroups.map(group => htmlEscape(group.name))
  const warningText = I18n.t(
    {
      one: 'Score does not include %{groups} because it has no points possible',
      other: 'Score does not include %{groups} because they have no points possible'
    },
    {
      count: names.length,
      groups: $.toSentence(names)
    }
  )

  return {
    icon: 'icon-warning final-warning',
    warningText
  }
}

function buildNoPointsPossibleWarning() {
  return {
    icon: 'icon-warning final-warning',
    warningText: I18n.t("Can't compute score until an assignment has points possible")
  }
}

// xsslint safeString.property score possible warningText icon letterGrade
function render(options) {
  let tooltip = ''
  let warningIcon = ''
  let grade
  let letterGrade = ''

  if (!options.hideTooltip) {
    let tooltipContent = '–'

    if (options.warning) {
      tooltipContent = `<div class="total-column-tooltip">${options.warning.warningText}</div>`
    } else if (!options.showPointsNotPercent) {
      tooltipContent = `${options.score} / ${options.possible}`
    } else if (options.possible) {
      tooltipContent = options.percentage
    }

    // xsslint safeString.identifier tooltipContent
    tooltip = `<div class="gradebook-tooltip">${tooltipContent}</div>`
  }

  if (options.warning) {
    warningIcon = `<i class="${options.warning.icon}"></i>`
  }

  if (options.showPointsNotPercent) {
    grade = options.score
  } else {
    grade = options.possible ? options.percentage : '–'
  }

  if (options.letterGrade) {
    const escapedGrade = _.escape(options.letterGrade)

    // xsslint safeString.identifier escapedGrade
    letterGrade = `<span class="letter-grade-points">${escapedGrade}</span>`
  }

  // xsslint safeString.identifier tooltip warningIcon grade letterGrade
  return `
    <div class="gradebook-cell">
      ${tooltip}
      <span class="grades">
        <span class="percentage">
          ${warningIcon}
          ${grade}
        </span>
        ${letterGrade}
      </span>
    </div>
  `
}

export default class TotalGradeCellFormatter {
  constructor(gradebook) {
    this.options = {
      getTotalPointsPossible() {
        return gradebook.getTotalPointsPossible()
      },
      gradesAreWeighted: gradebook.weightedGrades(),
      getGradingStandard() {
        return gradebook.options.grading_standard
      },
      listInvalidAssignmentGroups() {
        return gradebook.listInvalidAssignmentGroups()
      },
      listHiddenAssignments(studentId) {
        return gradebook.listHiddenAssignments(studentId)
      },
      shouldShowPoints() {
        return gradebook.options.show_total_grade_as_points
      },
      getAssignmentGroup(assignmentGroupId) {
        return gradebook.getAssignmentGroup(assignmentGroupId)
      }
    }
  }

  render = (_row, _cell, grade /* value */, _columnDef, student /* dataContext */) => {
    if (grade == null) {
      return ''
    }

    let percentage = getGradePercentage(grade.score, grade.possible)
    percentage = Number.isFinite(percentage) ? percentage : 0

    let points = getGradePoints(percentage) // 100% = 10 points
    points = Number.isFinite(points) ? points : 0

    let possible = round(grade.possible, round.DEFAULT)
    possible = possible ? I18n.n(possible) : possible

    let letterGrade
    // if (grade.possible && this.options.getGradingStandard()) {
    //   letterGrade = scoreToGrade(percentage, this.options.getGradingStandard())
    // }

    let warning
    if (this.options.listHiddenAssignments(student.id).length > 0) {
      warning = buildHiddenAssignmentsWarning()
    }

    if (!warning) {
      const invalidAssignmentGroups = this.options.listInvalidAssignmentGroups()
      if (invalidAssignmentGroups.length > 0) {
        warning = buildInvalidAssignmentGroupsWarning(invalidAssignmentGroups)
      }
    }

    if (!warning && this.options.getTotalPointsPossible() === 0) {
      warning = buildNoPointsPossibleWarning()
    }

    let score = I18n.n(round(points, 1));

    let assignments = Object.keys(student).filter(function(k) {
      return k.indexOf('assignment_') == 0 && k.indexOf('group') == -1;
    }).reduce(function(newData, k) {
      newData[k] = student[k];
      return newData;
    }, {});

    let assignmentsKeys = Object.keys(assignments);
    if (assignmentsKeys.length != 0) {
      let firstAssign = assignments[assignmentsKeys[0]].assignment;

      let gr_type_name = '';
      let is_mod_cat = false;
      let gp_info;
      let passing_grade_bba;

      if (firstAssign && firstAssign.grade_type_name) {
        gr_type_name = firstAssign.grade_type_name;
      } else {
        gr_type_name = student.enrollments[0].grade_type_name;
      }

      if (firstAssign && firstAssign.is_module_category) {
        is_mod_cat = firstAssign.is_module_category;
      } else {
        is_mod_cat = student.enrollments[0].is_module_category;
      }

      if (firstAssign && firstAssign.grade_passing_info) {
        gp_info = firstAssign.grade_passing_info;
      } else {
        gp_info = student.enrollments[0].grade_passing_info;
      }

      if (firstAssign && firstAssign.grade_passing_info) {
        passing_grade_bba = firstAssign.passing_grade;
      } else {
        passing_grade_bba = student.enrollments[0].passing_grade;
      }

      if (gr_type_name === 'Competency') {
        let has_missing = false;

        for (let a in assignments) {
          if (assignments[a].missing && assignments[a].assignmnent && !assignments[a].assignment.omit_from_final_grade) {
            has_missing = true;
            break;
          }
        }

          let has_zero = false;

          let assignment_groups = Object.keys(student).filter(function(k) {
              return k.indexOf('assignment_g') == 0;
          }).reduce(function(newwData, k) {
              newwData[k] = student[k];
              return newwData;
          }, {});

          for (let ag in assignment_groups) {
              if (assignment_groups[ag].submission_count && assignment_groups[ag].submission_count > 0 && assignment_groups[ag].submissions.map( s => s.score ).length && assignment_groups[ag].submissions.map( s => s.score ).includes(0)) {
                  has_zero = true;
                  break;
              }
          }

        if (has_missing) {
          letterGrade = 'Fail'
          score = 0
        } else {
          if (is_mod_cat) {
            if (has_zero) {
                letterGrade = 'Fail'
                score = 0
            } else {
                let developing = gp_info['Developing'];
                if (developing !== undefined) {
                    let failPoint = developing['end'];
                    let gradePassingInfo = gp_info;

                    let foundationalCount = 0
                    let enhancingCount = 0
                    let foundationalTotal = 0
                    let enhancingTotal = 0
                    letterGrade = 'Pass'

                    for (let a in assignments) {
                        if (assignments[a] && assignments[a].assignment && !assignments[a].assignment.omit_from_final_grade) {
                            if (assignments[a].assignment && assignments[a].assignment.component_type === 'Foundational') {
                                foundationalCount++;

                                if (parseFloat(gradePassingInfo['Novice']['start']) <= parseFloat(assignments[a].grade) && parseFloat(assignments[a].grade) <= parseFloat(gradePassingInfo['Novice']['end'])) {
                                    foundationalTotal += 0
                                }
                                if (parseFloat(gradePassingInfo['Developing']['start']) <= parseFloat(assignments[a].grade) && parseFloat(assignments[a].grade) <= parseFloat(gradePassingInfo['Developing']['end'])) {
                                    foundationalTotal += 1
                                }
                                if (parseFloat(gradePassingInfo['Competent']['start']) <= parseFloat(assignments[a].grade) && parseFloat(assignments[a].grade) <= parseFloat(gradePassingInfo['Competent']['end'])) {
                                    foundationalTotal += 2
                                }
                                if (parseFloat(gradePassingInfo['Strong']['start']) <= parseFloat(assignments[a].grade) && parseFloat(assignments[a].grade) <= parseFloat(gradePassingInfo['Strong']['end'])) {
                                    foundationalTotal += 3
                                }
                            } else if (assignments[a].assignment && assignments[a].assignment.component_type === 'Enhancing') {
                                enhancingCount++;

                                if (parseFloat(gradePassingInfo['Novice']['start']) <= parseFloat(assignments[a].grade) && parseFloat(assignments[a].grade) <= parseFloat(gradePassingInfo['Novice']['end'])) {
                                    enhancingTotal += 0
                                }
                                if (parseFloat(gradePassingInfo['Developing']['start']) <= parseFloat(assignments[a].grade) && parseFloat(assignments[a].grade) <= parseFloat(gradePassingInfo['Developing']['end'])) {
                                    enhancingTotal += 1
                                }
                                if (parseFloat(gradePassingInfo['Competent']['start']) <= parseFloat(assignments[a].grade) && parseFloat(assignments[a].grade) <= parseFloat(gradePassingInfo['Competent']['end'])) {
                                    enhancingTotal += 2
                                }
                                if (parseFloat(gradePassingInfo['Strong']['start']) <= parseFloat(assignments[a].grade) && parseFloat(assignments[a].grade) <= parseFloat(gradePassingInfo['Strong']['end'])) {
                                    enhancingTotal += 3
                                }
                            }
                        }
                    }

                    let f_part = 0
                    let e_part = 0

                    if (foundationalCount > 0) {
                        f_part = ((foundationalTotal-2*foundationalCount)/foundationalCount*2.25)
                    }

                    if (enhancingCount > 0) {
                        e_part = (enhancingTotal/(3*enhancingCount)*2.25)
                    }

                    score = 5.5 + f_part + e_part
                    score = round(score, 1)

                    let gr_arr = [];
                    for (let a in assignments) {
                        if (assignments[a] && assignments[a].assignment && !assignments[a].assignment.omit_from_final_grade) {
                            if (assignments[a].assignment && assignments[a].assignment.component_type === 'Foundational') {
                                gr_arr.push(assignments[a].assignment.assignment_group_id)
                            }
                        }
                    }

                    gr_arr = gr_arr.filter((value, index, self) => self.indexOf(value) === index)

                    for (let gr in gr_arr) {
                        let filtered = Object.values(assignments).filter(function(a) {
                            return a.assignment && !a.assignment.omit_from_final_grade && a.assignment.assignment_group_id == gr_arr[gr]
                        })

                        let length = filtered.length
                        let sub_sum = 0

                        let gr_total = filtered.map(function(a) { return Number(a.grade) }).reduce((a, b) => a + b, 0)

                        sub_sum = gr_total / length

                        if (sub_sum <= failPoint) {
                            score = 0;
                            letterGrade = 'Fail';
                            break
                        }
                    }
                }
            }
          } else {
            if (has_zero) {
              letterGrade = 'Fail'
              score = 0
            } else {
              letterGrade = 'Fail'

              if (Number(score) > 0) {
                letterGrade = 'Pass'
              }
            }
          }
        }
      }


      if (gr_type_name === 'Points (2026)' || gr_type_name === 'Points MBM') {
        let has_missing = false;

        for (let a in assignments) {
          const assignment = assignments[a].assignment;
          if (!assignment || assignment.omit_from_final_grade) {
            continue;
          }

          const assignmentGroup = this.options.getAssignmentGroup(assignment.assignment_group_id);
          if (!assignmentGroup || !assignmentGroup.mandatory) {
            continue;
          }

          if (assignments[a].missing) {
            has_missing = true;
            break;
          }
        }

        if (has_missing) {
          letterGrade = 'Fail'
          score = 0
        } else {
          letterGrade = 'Fail'

          if (Number(score) >= parseFloat(passing_grade_bba)) {
            letterGrade = 'Pass'
          }
        }
      }
    }

    const options = {
      hideTooltip: this.options.gradesAreWeighted && !warning,
      letterGrade,
      percentage: I18n.n(round(percentage, round.DEFAULT), {percentage: true}),
      possible,
      score: score,
      showPointsNotPercent: true,
      warning
    }

    return render(options)
  }
}
