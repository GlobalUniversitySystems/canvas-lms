/*
 * Copyright (C) 2015 - present Instructure, Inc.
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
import {string, func, shape, bool} from 'prop-types'
import {Button} from '@instructure/ui-buttons'
import {Table} from '@instructure/ui-table'
import {Tooltip} from '@instructure/ui-tooltip'
import {SVGIcon} from '@instructure/ui-svg-images'
import {IconMasqueradeLine, IconMessageLine, IconEditLine} from '@instructure/ui-icons'
import I18n from 'i18n!account_course_user_search'
import FriendlyDatetime from '@canvas/datetime/react/components/FriendlyDatetime'
import CreateOrUpdateUserModal from './CreateOrUpdateUserModal'
import UserLink from './UserLink'

const ILPLOGO = `
<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.625 13.5H13.6327C13.3868 13.5 13.2639 13.5 13.1687 13.4355C13.0734 13.3711 13.0277 13.2569 12.9364 13.0286L12.5635 12.0964C12.4723 11.8681 12.4266 11.7539 12.3313 11.6895C12.2361 11.625 12.1132 11.625 11.8672 11.625H10.125C9.77145 11.625 9.59468 11.625 9.4848 11.5152C9.375 11.4053 9.375 11.2286 9.375 10.875V7.875M9.375 7.875V6M9.375 7.875H12.2917" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.375 4.5C8.54655 4.5 7.875 3.82843 7.875 3C7.875 2.17157 8.54655 1.5 9.375 1.5C10.2035 1.5 10.875 2.17157 10.875 3C10.875 3.82843 10.2035 4.5 9.375 4.5Z" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.16847 7.5C5.01551 7.85955 3.375 9.72338 3.375 11.9687C3.375 14.4713 5.41307 16.5 7.9272 16.5C9.45022 16.5 10.7986 15.7554 11.625 14.6119" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`

export default function UsersListRow({accountId, user, permissions, handleSubmitEditUserForm}) {
  return (
    <Table.Row>
      <Table.RowHeader>
        <UserLink
          href={`/accounts/${accountId}/users/${user.id}`}
          avatarName={user.short_name}
          name={user.sortable_name}
          avatar_url={user.avatar_url}
          size="x-small"
        />
        {user.ilp && (
          <SVGIcon src={ILPLOGO} />
        )}
      </Table.RowHeader>
      <Table.Cell>{user.email}</Table.Cell>
      <Table.Cell>{user.sis_user_id}</Table.Cell>
      <Table.Cell>{user.sno}</Table.Cell>
      <Table.Cell>{user.last_login && <FriendlyDatetime dateTime={user.last_login} />}</Table.Cell>
      <Table.Cell>
        {permissions.can_masquerade && (
          <Tooltip
            data-testid="user-list-row-tooltip"
            tip={I18n.t('Act as %{name}', {name: user.name})}
          >
            <Button variant="icon" size="small" href={`/users/${user.id}/masquerade`}>
              <IconMasqueradeLine title={I18n.t('Act as %{name}', {name: user.name})} />
            </Button>
          </Tooltip>
        )}
        {permissions.can_message_users && (
          <Tooltip
            data-testid="user-list-row-tooltip"
            tip={I18n.t('Send message to %{name}', {name: user.name})}
          >
            <Button
              variant="icon"
              size="small"
              href={`/conversations?user_name=${user.name}&user_id=${user.id}`}
            >
              <IconMessageLine title={I18n.t('Send message to %{name}', {name: user.name})} />
            </Button>
          </Tooltip>
        )}
        {permissions.can_edit_users && (
          <CreateOrUpdateUserModal
            createOrUpdate="update"
            url={`/accounts/${accountId}/users/${user.id}`}
            user={user}
            afterSave={handleSubmitEditUserForm}
          >
            <span>
              <Tooltip
                data-testid="user-list-row-tooltip"
                tip={I18n.t('Edit %{name}', {name: user.name})}
              >
                <Button variant="icon" size="small">
                  <IconEditLine title={I18n.t('Edit %{name}', {name: user.name})} />
                </Button>
              </Tooltip>
            </span>
          </CreateOrUpdateUserModal>
        )}
      </Table.Cell>
    </Table.Row>
  )
}

UsersListRow.propTypes = {
  accountId: string.isRequired,
  user: CreateOrUpdateUserModal.propTypes.user.isRequired,
  handleSubmitEditUserForm: func.isRequired,
  permissions: shape({
    can_masquerade: bool,
    can_message_users: bool,
    can_edit_users: bool
  }).isRequired
}

UsersListRow.displayName = 'Row'
