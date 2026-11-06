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

import React, {useMemo} from 'react'
import {Flex} from '@instructure/ui-flex'
import {View} from '@instructure/ui-view'
import {Badge} from '@instructure/ui-badge'
import {Avatar} from '@instructure/ui-avatar'
import {Text} from '@instructure/ui-text'
import {List} from '@instructure/ui-list'
import {Heading} from '@instructure/ui-heading'
import {IconButton} from '@instructure/ui-buttons'
import {ToggleDetails} from '@instructure/ui-toggle-details'
import {
  IconXLine,
  IconAdminLine,
  IconCoursesLine,
  IconGroupLine,
  IconDashboardLine,
  IconLockLine,
  IconQuestionLine,
  IconInboxLine,
  IconCalendarMonthLine,
  IconClockLine,
  IconHomeLine,
} from '@instructure/ui-icons'
import {useScope as useI18nScope} from '@canvas/i18n'
import HelpDialog from './HelpDialog/index'
import {Link} from '@instructure/ui-link'
import CoursesList from './lists/CoursesList'
import GroupsList from './lists/GroupsList'
import AccountsList from './lists/AccountsList'
import ProfileTabsList from './lists/ProfileTabsList'
import HistoryList from './lists/HistoryList'
import {useQuery} from '@canvas/query'
import {getUnreadCount} from './queries/unreadCountQuery'
import {getExternalTools} from './utils'
import type {ExternalTool} from './utils'

const I18n = useI18nScope('MobileGlobalMenu')

type Props = {
  onDismiss: () => void
}

export default function MobileGlobalMenu(props: Props) {
  const externalTools = useMemo<ExternalTool[]>(() => getExternalTools(), [])
  const showGroups = useMemo(() => Boolean(document.getElementById('global_nav_groups_link')), [])
  const countsEnabled = Boolean(
    window.ENV.current_user_id && !window.ENV.current_user?.fake_student
  )
  const k5User = window.ENV.K5_USER
  const showAdmin = window.ENV.current_user_is_admin
  const current_user: {
    display_name: string
    avatar_image_url: string
  } = window.ENV.current_user

  const {data: unreadConversationsCount, isSuccess: unreadConversationsCountHasLoaded} = useQuery({
    queryKey: ['unread_count', 'conversations'],
    queryFn: getUnreadCount,
    staleTime: 2 * 60 * 1000, // two minutes
    enabled: countsEnabled && !ENV.current_user_disabled_inbox,
  })

  return (
    <View
      display="block"
      height="100%"
      width="100%"
      textAlign="start"
      padding="medium large medium medium"
    >
      <Flex direction="row-reverse" margin="0 0 large 0">
        <Flex.Item>
          <IconButton
            renderIcon={IconXLine}
            withBackground={false}
            withBorder={false}
            onClick={props.onDismiss}
            screenReaderLabel="Close"
          />
        </Flex.Item>
        <Flex.Item shouldGrow={true} shouldShrink={true}>
          <Heading>
            <a className="ic-brand-mobile-global-nav-logo" href="/">
              <span className="screenreader-only">
                {k5User ? I18n.t('Home') : I18n.t('My Dashboard')}
              </span>
            </a>
          </Heading>
        </Flex.Item>
      </Flex>
      <List isUnstyled={true} itemSpacing="medium">
        <List.Item>
          <Link href="/" isWithinText={false} display="block">
            <Flex>
              <Flex.Item width="3rem">
                {k5User ? (
                  <IconHomeLine inline={false} size="small" />
                ) : (
                  <IconDashboardLine inline={false} size="small" />
                )}
              </Flex.Item>
              <Flex.Item>
                <Text size="medium">{k5User ? I18n.t('Home') : I18n.t('Dashboard')}</Text>
              </Flex.Item>
            </Flex>
          </Link>
        </List.Item>

        <List.Item>
          {current_user && Object.keys(current_user).length > 0 ? (
            <ToggleDetails
              iconPosition="end"
              fluidWidth={true}
              summary={
                <Flex>
                  <Flex.Item width="3rem">
                    <Avatar
                      name={current_user.display_name}
                      src={current_user.avatar_image_url}
                      size="x-small"
                      data-fs-exclude={true}
                    />
                  </Flex.Item>
                  <Flex.Item>
                    <Text color="brand">{I18n.t('Account')}</Text>
                  </Flex.Item>
                </Flex>
              }
            >
              <ProfileTabsList />
            </ToggleDetails>
          ) : (
            <Link href="/login" isWithinText={false} display="block">
              <Flex>
                <Flex.Item width="3rem">
                  <IconLockLine inline={false} size="small" />
                </Flex.Item>
                <Flex.Item>
                  <Text size="medium">{I18n.t('Login')}</Text>
                </Flex.Item>
              </Flex>
            </Link>
          )}
        </List.Item>

        {showAdmin && (
          <List.Item>
            <ToggleDetails
              iconPosition="end"
              fluidWidth={true}
              summary={
                <Flex>
                  <Flex.Item width="3rem">
                    <IconAdminLine inline={false} size="small" color="brand" />
                  </Flex.Item>
                  <Flex.Item>
                    <Text color="brand">{I18n.t('Admin')}</Text>
                  </Flex.Item>
                </Flex>
              }
            >
              <AccountsList />
            </ToggleDetails>
          </List.Item>
        )}

        <List.Item>
          <ToggleDetails
            iconPosition="end"
            fluidWidth={true}
            summary={
              <Flex>
                <Flex.Item width="3rem">
                  <IconCoursesLine inline={false} size="small" color="brand" />
                </Flex.Item>
                <Flex.Item>
                  <Text color="brand">{k5User ? I18n.t('Subjects') : I18n.t('Courses')}</Text>
                </Flex.Item>
              </Flex>
            }
          >
            <CoursesList />
          </ToggleDetails>
        </List.Item>

        {showGroups && (
          <List.Item>
            <ToggleDetails
              iconPosition="end"
              fluidWidth={true}
              summary={
                <Flex>
                  <Flex.Item width="3rem">
                    <IconGroupLine inline={false} size="small" color="brand" />
                  </Flex.Item>
                  <Flex.Item>
                    <Text color="brand">{I18n.t('Groups')}</Text>
                  </Flex.Item>
                </Flex>
              }
            >
              <GroupsList />
            </ToggleDetails>
          </List.Item>
        )}

        <List.Item>
          <Link href="/calendar" isWithinText={false} display="block">
            <Flex>
              <Flex.Item width="3rem">
                <IconCalendarMonthLine inline={false} size="small" />
              </Flex.Item>
              <Flex.Item>
                <Text size="medium">{I18n.t('Calendar')}</Text>
              </Flex.Item>
            </Flex>
          </Link>
        </List.Item>

        <List.Item>
          <Link href="/inbox" isWithinText={false} display="block">
            <Flex>
              <Flex.Item width="3rem">
                <IconInboxLine inline={false} size="small" />
              </Flex.Item>
              <Flex.Item>
                <Text size="medium">{I18n.t('Inbox')}</Text>
                {unreadConversationsCountHasLoaded && unreadConversationsCount > 0 && (
                  <Badge standalone={true} margin="0 small" count={unreadConversationsCount} />
                )}
              </Flex.Item>
            </Flex>
          </Link>
        </List.Item>

        {externalTools.map(tool => (
          <List.Item key={tool.href}>
            <Link href={tool.href || ''} isWithinText={false} display="block">
              <Flex>
                <Flex.Item width="3rem">
                  {'svgPath' in tool ? (
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      xmlnsXlink="http://www.w3.org/1999/xlink"
                      viewBox="0 0 64 64"
                      dangerouslySetInnerHTML={{__html: tool.svgPath}}
                      width="1em"
                      height="1em"
                      aria-hidden="true"
                      role="presentation"
                      focusable="false"
                      style={{fill: 'currentColor', fontSize: 32}}
                    />
                  ) : (
                    <img width="1em" height="1em" src={tool.imgSrc} alt="" />
                  )}
                </Flex.Item>
                <Flex.Item>
                  <Text size="medium">{tool.label}</Text>
                </Flex.Item>
              </Flex>
            </Link>
          </List.Item>
        ))}

        <List.Item>
          <ToggleDetails
            iconPosition="end"
            fluidWidth={true}
            summary={
              <Flex>
                <Flex.Item width="3rem">
                  <IconClockLine inline={false} size="small" color="brand" />
                </Flex.Item>
                <Flex.Item>
                  <Text color="brand">{I18n.t('History')}</Text>
                </Flex.Item>
              </Flex>
            }
          >
            <View as="div" margin="0 0 0 xx-large">
              <HistoryList />
            </View>
          </ToggleDetails>
        </List.Item>

        <List.Item>
          <Link href="https://study.lccm.org.uk/courses/192" isWithinText={false} target="_blank" size="small" textAlign="start" display="block">
            <Flex>
              <Flex.Item width="3rem">
                <svg version="1.1" height="32" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve">
                  <g>
                    <g>
                      <path fill="#2773E2" d="M271.208,30.703h-30.417H0v327.49v30.417v50.695h54.656v41.991l41.287-16.052l41.287,16.052v-41.991H512V388.61v-30.417
			V30.703H271.208z M271.208,61.12h210.374v297.073H271.208V61.12z M54.656,408.889H30.417V388.61h24.238V408.889z M106.812,436.835
			l-10.87-4.226l-10.869,4.226V388.61h21.739V436.835z M106.813,358.193h-21.74H54.656H30.417V61.12h210.374v297.073H137.23H106.813
			z M195.166,408.889H137.23V388.61h57.936V408.889z M286.417,408.889h-60.834V388.61h15.209h30.417h15.209V408.889z
			 M316.834,408.889V388.61h164.748v20.278H316.834z"/>
                    </g>
                  </g>
                  <g>
                    <g>
                      <rect fill="#2773E2" x="61.589" y="93.056" width="148.031" height="30.417"/>
                    </g>
                  </g>
                  <g>
                    <g>
                      <rect fill="#2773E2" x="169.819" y="194.447" width="39.806" height="30.417"/>
                    </g>
                  </g>
                  <g>
                    <g>
                      <rect fill="#2773E2" x="61.589" y="194.447" width="87.946" height="30.417"/>
                    </g>
                  </g>
                  <g>
                    <g>
                      <rect fill="#2773E2" x="302.378" y="93.056" width="39.806" height="30.417"/>
                    </g>
                  </g>
                  <g>
                    <g>
                      <rect fill="#2773E2" x="362.462" y="93.056" width="87.946" height="30.417"/>
                    </g>
                  </g>
                  <g>
                    <g>
                      <rect fill="#2773E2" x="61.589" y="295.838" width="39.806" height="30.417"/>
                    </g>
                  </g>
                  <g>
                    <g>
                      <rect fill="#2773E2" x="121.669" y="295.838" width="87.946" height="30.417"/>
                    </g>
                  </g>
                  <g>
                    <g>
                      <rect fill="#2773E2" x="302.378" y="194.447" width="148.031" height="30.417"/>
                    </g>
                  </g>
                  <g>
                    <g>
                      <rect fill="#2773E2" x="302.378" y="295.838" width="97.335" height="30.417"/>
                    </g>
                  </g>
                </svg>

              </Flex.Item>
              <Flex.Item>
                <Text size="medium">Student Success Tutors</Text>
              </Flex.Item>
            </Flex>
          </Link>
        </List.Item>

        <List.Item>
          <ToggleDetails
            iconPosition="end"
            fluidWidth={true}
            summary={
              <Flex>
                <Flex.Item width="3rem">
                  <IconQuestionLine inline={false} size="small" color="brand" />
                </Flex.Item>
                <Flex.Item>
                  <Text color="brand">{window.ENV.help_link_name || I18n.t('Help')}</Text>
                </Flex.Item>
              </Flex>
            }
          >
            <View as="div" margin="0 0 0 xx-large">
              <HelpDialog onFormSubmit={props.onDismiss} />
            </View>
          </ToggleDetails>
        </List.Item>
      </List>
    </View>
  )
}
