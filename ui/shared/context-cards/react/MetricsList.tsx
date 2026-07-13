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

import React from 'react'
import round from 'round'
import PropTypes from 'prop-types'
import {useScope as createI18nScope} from '@canvas/i18n'
import {Metric, MetricGroup} from '@instructure/ui-metric'

const I18n = createI18nScope('student_context_trayMetricsList')

class MetricsList extends React.Component {
  static propTypes = {
    analytics: PropTypes.object,
    user: PropTypes.object,
    course: PropTypes.object,
    allowFinalGradeOverride: PropTypes.bool,
  }

  static defaultProps = {
    analytics: null,
    user: {},
    course: {},
    allowFinalGradeOverride: false,
  }

  get grade() {
    // @ts-expect-error TS2339 (typescriptify)
    if (typeof this.props.user.enrollments === 'undefined') {
      return null
    }

    if (
      this.props.course &&
      this.props.course.componentFullCompletion &&
      this.props.course.submissionsConnection &&
      this.props.course.submissionsConnection.edges &&
      this.props.course.componentPassingGrade
    ) {
      const submissionScores = this.props.course.submissionsConnection.edges.map(
        e => e.submission.score,
      )
      if (
        submissionScores.length > 0 &&
        Math.min(
          ...this.props.course.submissionsConnection.edges
            .map(e => e.submission.score)
            .filter(e => e),
        ) < this.props.course.componentPassingGrade
      ) {
        return '-'
      }
    }

    // @ts-expect-error TS2339 (typescriptify)
    const enrollment = this.props.user.enrollments[0]
    // @ts-expect-error TS2339 (typescriptify)
    const gradeOverride = this.props.allowFinalGradeOverride
    if (enrollment) {
      const grades = enrollment.grades
      if (this.props.course.componentFullCompletion) {
        if (grades.override_grade != null) {
          if (
            this.props.course.componentPassingGrade &&
            grades.override_grade < this.props.course.componentPassingGrade
          ) {
            return '-'
          }
          return round(grades.override_grade, 0)
        } else if (grades.override_score != null) {
          if (
            this.props.course.componentPassingGrade &&
            grades.override_score < this.props.course.componentPassingGrade
          ) {
            return '-'
          }
          return `${round(grades.override_score, 0)}%`
        } else if (grades.current_grade != null) {
          if (
            this.props.course.componentPassingGrade &&
            grades.current_grade < this.props.course.componentPassingGrade
          ) {
            return '-'
          }
          return round(grades.current_grade, 0)
        } else if (grades.current_score != null) {
          if (
            this.props.course.componentPassingGrade &&
            grades.current_score < this.props.course.componentPassingGrade
          ) {
            return '-'
          }
          return `${round(grades.current_score, 0)}%`
        }
        return '-'
      } else {
        if (gradeOverride && grades.override_grade != null) {
          return grades.override_grade
        } else if (gradeOverride && grades.override_score != null) {
          return `${grades.override_score}%`
        } else if (grades.current_grade != null) {
          return grades.current_grade
        } else if (grades.current_score != null) {
          return `${grades.current_score}%`
        }
        return '-'
      }
    }
    return '-'
  }

  get missingCount() {
    // @ts-expect-error TS2339 (typescriptify)
    if (!this.props.analytics.tardiness_breakdown) {
      return null
    }

    // @ts-expect-error TS2339 (typescriptify)
    return `${this.props.analytics.tardiness_breakdown.missing}`
  }

  get lateCount() {
    // @ts-expect-error TS2339 (typescriptify)
    if (!this.props.analytics.tardiness_breakdown) {
      return null
    }

    // @ts-expect-error TS2339 (typescriptify)
    return `${this.props.analytics.tardiness_breakdown.late}`
  }

  render() {
    // @ts-expect-error TS2339 (typescriptify)
    if (typeof this.props.user.enrollments !== 'undefined' && this.props.analytics) {
      return (
        <section className="StudentContextTray__Section StudentContextTray-MetricsList">
          <MetricGroup>
            <Metric renderLabel={I18n.t('Grade')} renderValue={this.grade} />
            <Metric renderLabel={I18n.t('Missing')} renderValue={this.missingCount} />
            <Metric renderLabel={I18n.t('Late')} renderValue={this.lateCount} />
          </MetricGroup>
        </section>
      )
    } else {
      return null
    }
  }
}

export default MetricsList
