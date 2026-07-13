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

import {useScope as createI18nScope} from '@canvas/i18n'
import React from 'react'
import {Text} from '@instructure/ui-text'
import {List} from '@instructure/ui-list'
import {Heading} from '@instructure/ui-heading'
import {Badge} from '@instructure/ui-badge'
import {SVGIcon} from '@instructure/ui-svg-images'
import {Avatar} from '@instructure/ui-avatar'
import {Spinner} from '@instructure/ui-spinner'
import {Link} from '@instructure/ui-link'
import {View} from '@instructure/ui-view'
import {IconExternalLinkLine} from '@instructure/ui-icons'
import LogoutButton from '../LogoutButton'
import HighContrastModeToggle from './HighContrastModeToggle'
import DyslexicFontToggle from './UseDyslexicFontToggle'
import {AccessibleContent} from '@instructure/ui-a11y-content'
import profileQuery from '../queries/profileQuery'
import {getUnreadCount} from '../queries/unreadCountQuery'
import type {ProfileTab, TabCountsObj} from '../../../../api.d'
import {useQuery} from '@tanstack/react-query'
import {sessionStoragePersister} from '@instructure/platform-query'

const ILPLOGO = `
<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.625 13.5H13.6327C13.3868 13.5 13.2639 13.5 13.1687 13.4355C13.0734 13.3711 13.0277 13.2569 12.9364 13.0286L12.5635 12.0964C12.4723 11.8681 12.4266 11.7539 12.3313 11.6895C12.2361 11.625 12.1132 11.625 11.8672 11.625H10.125C9.77145 11.625 9.59468 11.625 9.4848 11.5152C9.375 11.4053 9.375 11.2286 9.375 10.875V7.875M9.375 7.875V6M9.375 7.875H12.2917" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.375 4.5C8.54655 4.5 7.875 3.82843 7.875 3C7.875 2.17157 8.54655 1.5 9.375 1.5C10.2035 1.5 10.875 2.17157 10.875 3C10.875 3.82843 10.2035 4.5 9.375 4.5Z" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.16847 7.5C5.01551 7.85955 3.375 9.72338 3.375 11.9687C3.375 14.4713 5.41307 16.5 7.9272 16.5C9.45022 16.5 10.7986 15.7554 11.625 14.6119" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`

const I18n = createI18nScope('ProfileTray')

// Trying to keep this as generalized as possible, but it's still a bit
// gross matching on the id of the tray tabs given to us by Rails
const idsToCounts = [{id: 'content_shares', countName: 'unreadShares'}]

function CountBadge({counts, id}: {counts: TabCountsObj; id: string}) {
  const found = idsToCounts.filter(x => x.id === id)
  if (found.length === 0) return null // no count defined for this label
  const count = counts[found[0].countName]
  if (count === 0) return null // zero count is not displayed
  return (
    <Badge
      count={count}
      standalone={true}
      margin="0 0 xxx-small small"
      formatOutput={(count_: string) => (
        <AccessibleContent alt={I18n.t('%{count} unread.', {count: count_})}>
          {count_}
        </AccessibleContent>
      )}
    />
  )
}

function ProfileTabLink({id, html_url, label, counts, type}: ProfileTab) {
  const isNavMenuLink = type === 'external' && id?.startsWith('nav_menu_link_')
  const target = isNavMenuLink || html_url.includes('display=borderless') ? '_blank' : undefined
  return (
    <View className={`profile-tab-${id}`} as="div" margin="small 0">
      <Link isWithinText={false} href={html_url} target={target}>
        {label}
        <CountBadge counts={counts} id={id} />
        {isNavMenuLink && <IconExternalLinkLine size="x-small" style={{paddingLeft: '0.3em'}} />}
      </Link>
    </View>
  )
}

export default function ProfileTray() {
  const {
    data: profileTabs,
    isLoading,
    isSuccess,
  } = useQuery<ProfileTab[], Error>({
    queryKey: ['profile'],
    queryFn: profileQuery,
    persister: sessionStoragePersister.persisterFn,
  })

  const countsEnabled = Boolean(
    window.ENV.current_user_id && !window.ENV.current_user?.fake_student,
  )

  const {data: unreadContentSharesCount} = useQuery({
    queryKey: ['unread_count', 'content_shares'],
    queryFn: getUnreadCount,
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: countsEnabled && ENV.CAN_VIEW_CONTENT_SHARES,
    persister: sessionStoragePersister.persisterFn,
  })

  const counts: TabCountsObj = {
    unreadShares: unreadContentSharesCount,
  }

  const userDisplayName = window.ENV.current_user.display_name
  const userPronouns = window.ENV.current_user.pronouns
  const userAvatarURL = window.ENV.current_user.avatar_is_fallback
    ? ''
    : window.ENV.current_user.avatar_image_url
  const userIlp = window.ENV.current_user.ilp

  // Check if we have any accessibility settings to show
  const hasAccessibilitySettings = true // High contrast is always available
  const hasDyslexicFont = 'use_dyslexic_font' in window.ENV

  return (
    <View as="div" padding="medium">
      <View textAlign="center">
        <Avatar
          name={userDisplayName}
          src={userAvatarURL}
          alt={I18n.t('User profile picture')}
          size="x-large"
          display="block"
          margin="auto"
          data-fs-exclude={true}
        />
        <div style={{wordBreak: 'break-word'}}>
          <Heading level="h3" as="h2">
            {userDisplayName}
            {userIlp && <SVGIcon src={ILPLOGO} />}
            {userPronouns && (
              <Text size="large" fontStyle="italic">
                &nbsp;({userPronouns})
              </Text>
            )}
          </Heading>
        </div>
        <LogoutButton size="small" margin="medium 0 x-small 0" />
      </View>
      <hr role="presentation" />
      <List isUnstyled={true} margin="none" itemSpacing="small">
        {isLoading && (
          <List.Item key="loading">
            <div style={{textAlign: 'center'}}>
              <Spinner margin="medium" renderTitle="Loading" />
            </div>
          </List.Item>
        )}
        {isSuccess &&
          profileTabs.map(tab => (
            <List.Item key={tab.id}>
              <ProfileTabLink {...tab} counts={counts} />
            </List.Item>
          ))}
      </List>

      {hasAccessibilitySettings && (
        <>
          <hr role="presentation" />
          <Heading level="h3" as="h3" margin="small 0">
            {I18n.t('Accessibility Settings')}
          </Heading>
          <HighContrastModeToggle />
          {hasDyslexicFont && <DyslexicFontToggle />}
        </>
      )}
    </View>
  )
}
