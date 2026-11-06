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

import round from 'round'
import I18n from '@canvas/i18n'
import {scoreToPercentage, scoreToPoints} from '@canvas/grading/GradeCalculationHelper'

function getGradePercentage(score, pointsPossible) {
  const grade = scoreToPercentage(score, pointsPossible)
  return round(grade, round.DEFAULT)
}

function getGradePoints(score) {
  const grade = scoreToPoints(score)
  return round(grade, 1)
}

function render(options) {
  // const percentage = options.possible ? options.percentage : '–'
  const failedClass = options.isFailed && options.possible ? 'gradebook-cell--failed-assignment-group' : ''
  const grade = options.possible ? options.score : '-'

  // xsslint safeString.property score possible
  // xsslint safeString.identifier percentage
  return `
    <div class="gradebook-cell ${failedClass}">
      <span class="percentage">${grade}</span>
    </div>
  `
}

export default class AssignmentGroupCellFormatter {
  render = (_row, _cell, value, columnDef, _dataContext) => {
    if (value == null) {
      return ''
    }

    let percentage = getGradePercentage(value.score, value.possible)
    percentage = Number.isFinite(percentage) ? percentage : 0

    let points = getGradePoints(percentage) // 100% = 10 points
    points = Number.isFinite(points) ? points : 0

    let possible = round(value.possible, round.DEFAULT)
    possible = possible ? I18n.n(10) : possible // component total possible = 10 points


    const defaultLegacyFailPoint = 5.4

    let failPoint = defaultLegacyFailPoint

    if (columnDef.object.grade_type_name === 'Competency') {
      //if (columnDef.object.is_module_category === false) {
        let developing = columnDef.object.grade_passing_info['Developing']
        if (developing !== undefined) {
          failPoint = developing['end']
        }
      //}
    }

    if (columnDef.object.grade_type_name === 'Points (2026)' || columnDef.object.grade_type_name === 'Points MBM') {
      failPoint = columnDef.object.passing_grade
    }

    let isFailed: boolean

    if (columnDef.object.grade_type_name === 'Points (2026)' || columnDef.object.grade_type_name === 'Points MBM') {
      isFailed = value.group_weight && round(points, 1) < failPoint
    } else {
      isFailed = value.group_weight && round(points, 1) <= failPoint
    }

    let displayScore = I18n.n(round(points, 1))

    if (columnDef.object.grade_type_name === 'Competency') {
            let missing = value.submissions.map( (s) => {return s.submission.missing})

        if (missing.length && missing.includes(true)) {
            // if (columnDef.object.is_module_category === true) {
                displayScore = 'Ungradable'
                isFailed = true
            // }  else {
            //     displayScore = 0
            //     isFailed = true
            // }
        } else {
          // if (columnDef.object.is_module_category === true) {
              isFailed = round(points, 1) <= failPoint
              let gradePassingInfo = columnDef.object.grade_passing_info
              if (gradePassingInfo['Novice']['start'] <= points && points <= gradePassingInfo['Novice']['end']) {
                  displayScore = 'Novice'
              }
              if (gradePassingInfo['Developing']['start'] <= points && points <= gradePassingInfo['Developing']['end']) {
                  displayScore = 'Developing'
              }
              if (gradePassingInfo['Competent']['start'] <= points && points <= gradePassingInfo['Competent']['end']) {
                  displayScore = 'Competent'
              }
              if (gradePassingInfo['Strong']['start'] <= points && points <= gradePassingInfo['Strong']['end']) {
                  displayScore = 'Strong'
              }
              if (percentage == 0) {
                  isFailed = true
                  displayScore = 'Ungradable'
              }
          // }
        }
    }

    if (columnDef.object.grade_type_name === 'Points (2026)') {
      let missing = value.submissions.map( (s) => {return s.submission.missing})

      if (missing.length && missing.includes(true)) {
        displayScore = 'Ungradable'
        isFailed = true
      } else {
        isFailed = round(points, 1) < failPoint

        let gradePassingInfo = columnDef.object.grade_passing_info
        if (gradePassingInfo['Novice']['start'] <= points && points <= gradePassingInfo['Novice']['end']) {
          displayScore = 'Novice (' + I18n.n(round(points, 1)) + ')'
        }
        if (gradePassingInfo['Developing']['start'] <= points && points <= gradePassingInfo['Developing']['end']) {
          displayScore = 'Developing (' + I18n.n(round(points, 1)) + ')'
        }
        if (gradePassingInfo['Competent']['start'] <= points && points <= gradePassingInfo['Competent']['end']) {
          displayScore = 'Competent (' + I18n.n(round(points, 1)) + ')'
        }
        if (gradePassingInfo['Strong']['start'] <= points && points <= gradePassingInfo['Strong']['end']) {
          displayScore = 'Strong (' + I18n.n(round(points, 1)) + ')'
        }
        if (percentage == 0) {
          isFailed = true
          displayScore = 'Ungradable'
        }
      }
    }

    if (columnDef.object.grade_type_name === 'Points MBM') {
      // Unlike Points (2026) above, "Points MBM"'s grade_passing_info is a
      // simple {"Fail": ..., "Pass": ...} display-only hash (not
      // Competency's 4-band structure), so the group label here is just
      // Pass/Fail against the same passing_grade threshold used everywhere
      // else in this scheme - see doc/points_mbm_grading_scheme.md.
      let missing = value.submissions.map( (s) => {return s.submission.missing})

      if (missing.length && missing.includes(true)) {
        displayScore = 'Ungradable'
        isFailed = true
      } else {
        isFailed = round(points, 1) < failPoint
        displayScore = (isFailed ? 'Fail' : 'Pass') + ' (' + I18n.n(round(points, 1)) + ')'

        if (percentage == 0) {
          isFailed = true
          displayScore = 'Ungradable'
        }
      }
    }

    const templateOpts = {
      percentage: I18n.n(round(percentage, round.DEFAULT), {percentage: true}),
      possible,
      score: displayScore,
      isFailed
    }

    return render(templateOpts)
  }
}
