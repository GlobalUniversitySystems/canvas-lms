/*
 * Copyright (C) 2021 - present Instructure, Inc.
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
import htmlEscape from 'html-escape'
import I18n from 'i18n!gradebook'

export function getSecondaryDisplayInfo(student, secondaryInfo, options) {
  if (options.shouldShowSections() && secondaryInfo === 'section') {
    const sectionNames = student.sections
      .filter(options.isVisibleSection)
      .map(sectionId => options.getSection(sectionId).name)
    return $.toSentence(sectionNames.sort())
  }

  if (options.shouldShowGroups() && secondaryInfo === 'group') {
    const groupNames = student.group_ids.map(groupId => options.getGroup(groupId).name)
    return $.toSentence(groupNames.sort())
  }

  return {
    login_id: student.login_id,
    sis_id: student.sis_user_id,
    integration_id: student.integration_id
  }[secondaryInfo]
}

export function getEnrollmentLabel(student) {
  if (student.isConcluded) {
    return I18n.t('concluded')
  }
  if (student.isInactive) {
    return I18n.t('inactive')
  }

  return null
}

export function getOptions(gradebook) {
  return {
    courseId: gradebook.options.context_id,
    getSection(sectionId) {
      return gradebook.sections[sectionId]
    },
    getGroup(groupId) {
      return gradebook.studentGroups[groupId]
    },
    getSelectedPrimaryInfo() {
      return gradebook.getSelectedPrimaryInfo()
    },
    getSelectedSecondaryInfo() {
      return gradebook.getSelectedSecondaryInfo()
    },
    isVisibleSection(sectionId) {
      return gradebook.sections[sectionId] != null
    },
    shouldShowSections() {
      return gradebook.showSections()
    },
    shouldShowGroups() {
      return gradebook.studentGroupsEnabled
    }
  }
}

// xsslint safeString.property enrollmentLabel secondaryInfo studentId courseId url displayName
export function renderCell(options) {
  let enrollmentStatus = ''
  let secondaryInfo = ''

  if (options.enrollmentLabel) {
    const title = I18n.t('This user is currently not able to access the course')
    // xsslint safeString.identifier title
    enrollmentStatus = `&nbsp;<span title="${title}" class="label">${options.enrollmentLabel}</span>`
  }

  if (options.secondaryInfo) {
    secondaryInfo = `<div class="secondary-info">${options.secondaryInfo}</div>`
  }

  let ilp = '';

  if (options.isIlp) {
    ilp = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.625 13.5H13.6327C13.3868 13.5 13.2639 13.5 13.1687 13.4355C13.0734 13.3711 13.0277 13.2569 12.9364 13.0286L12.5635 12.0964C12.4723 11.8681 12.4266 11.7539 12.3313 11.6895C12.2361 11.625 12.1132 11.625 11.8672 11.625H10.125C9.77145 11.625 9.59468 11.625 9.4848 11.5152C9.375 11.4053 9.375 11.2286 9.375 10.875V7.875M9.375 7.875V6M9.375 7.875H12.2917" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.375 4.5C8.54655 4.5 7.875 3.82843 7.875 3C7.875 2.17157 8.54655 1.5 9.375 1.5C10.2035 1.5 10.875 2.17157 10.875 3C10.875 3.82843 10.2035 4.5 9.375 4.5Z" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.16847 7.5C5.01551 7.85955 3.375 9.72338 3.375 11.9687C3.375 14.4713 5.41307 16.5 7.9272 16.5C9.45022 16.5 10.7986 15.7554 11.625 14.6119" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  }

  // xsslint safeString.identifier enrollmentStatus secondaryInfo
  return `
    <div class="student-name">
      <a
        class="student-grades-link student_context_card_trigger"
        data-student_id="${options.studentId}"
        data-course_id="${options.courseId}"
        href="${options.url}"
      >${htmlEscape(options.displayName)}
      ${ilp}
      </a>
      ${enrollmentStatus}
    </div>
    ${secondaryInfo}
  `
}
