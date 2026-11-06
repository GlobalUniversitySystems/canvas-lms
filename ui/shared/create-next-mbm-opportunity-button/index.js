/*
 * Copyright (C) 2026 - present Instructure, Inc.
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
import axios from '@canvas/axios'
import {useScope as useI18nScope} from '@canvas/i18n'

const I18n = useI18nScope('create_next_mbm_opportunity_button')

// Wires up the "Create Second Opportunity"/"Create Resit" button rendered
// on the Assignment/Quiz/Discussion show pages for "Points MBM" mandatory
// assignment groups. Shared across assignment_show, quiz_show and
// discussion_topic bundles since the markup/behavior is identical - only
// the underlying submittable (assignment, quiz, or discussion) and the
// button's label (Second Opportunity vs Resit) differ, and the label is
// already rendered server-side into the button text.
export default function bindCreateNextMbmOpportunityButton() {
  $('#create_next_mbm_opportunity_button').on('click', function () {
    const $button = $(this)
    const url = $button.data('url')
    if (!url || $button.prop('disabled')) return

    $button.prop('disabled', true)

    axios
      .post(url)
      .then(() => {
        window.location.reload()
      })
      .catch(error => {
        $button.prop('disabled', false)
        const message =
          error?.response?.data?.error ||
          I18n.t('An error occurred while creating the next opportunity assignment.')
        // eslint-disable-next-line no-alert
        window.alert(message)
      })
  })
}
