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
import PropTypes from 'prop-types'
import {useScope as createI18nScope} from '@canvas/i18n'
import Avatar from './Avatar'
import LastActivity from './LastActivity'
import MetricsList from './MetricsList'
import Rating from './Rating'
import SectionInfo from './SectionInfo'
import SubmissionProgressBars from './SubmissionProgressBars'
import MessageStudents from '@canvas/message-students-modal'
import {Text} from '@instructure/ui-text'
import {Heading} from '@instructure/ui-heading'
import {Spinner} from '@instructure/ui-spinner'
import {SVGIcon} from '@instructure/ui-svg-images'
import {Button, CloseButton} from '@instructure/ui-buttons'
import {ScreenReaderContent} from '@instructure/ui-a11y-content'
import {Tray} from '@instructure/ui-tray'
import {Link} from '@instructure/ui-link'
import {View} from '@instructure/ui-view'
import {Flex} from '@instructure/ui-flex'
import {Tag} from '@instructure/ui-tag'
import {htmlDecode} from '@canvas/util/TextHelper'

const ILPLOGO = `
<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.625 13.5H13.6327C13.3868 13.5 13.2639 13.5 13.1687 13.4355C13.0734 13.3711 13.0277 13.2569 12.9364 13.0286L12.5635 12.0964C12.4723 11.8681 12.4266 11.7539 12.3313 11.6895C12.2361 11.625 12.1132 11.625 11.8672 11.625H10.125C9.77145 11.625 9.59468 11.625 9.4848 11.5152C9.375 11.4053 9.375 11.2286 9.375 10.875V7.875M9.375 7.875V6M9.375 7.875H12.2917" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.375 4.5C8.54655 4.5 7.875 3.82843 7.875 3C7.875 2.17157 8.54655 1.5 9.375 1.5C10.2035 1.5 10.875 2.17157 10.875 3C10.875 3.82843 10.2035 4.5 9.375 4.5Z" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.16847 7.5C5.01551 7.85955 3.375 9.72338 3.375 11.9687C3.375 14.4713 5.41307 16.5 7.9272 16.5C9.45022 16.5 10.7986 15.7554 11.625 14.6119" stroke="#505B63" style="stroke:#505B63;stroke:color(display-p3 0.3137 0.3569 0.3882);stroke-opacity:1;" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`

const I18n = createI18nScope('student_context_trayStudentContextTray')

const courseShape = PropTypes.shape({
  permissions: PropTypes.shape({}).isRequired,
  submissionsConnection: PropTypes.shape({
    edges: PropTypes.arrayOf(PropTypes.shape({})),
  }).isRequired,
})
const userShape = PropTypes.shape({
  enrollments: PropTypes.arrayOf(PropTypes.object).isRequired,
})
const dataShape = PropTypes.shape({
  loading: PropTypes.bool.isRequired,
  course: courseShape,
  user: userShape,
  refetch: PropTypes.func,
})

export default class StudentContextTray extends React.Component {
  static propTypes = {
    courseId: PropTypes.string.isRequired,
    studentId: PropTypes.string.isRequired,
    returnFocusTo: PropTypes.func.isRequired,
    data: dataShape.isRequired,
    externalTools: PropTypes.arrayOf(
      PropTypes.shape({
        base_url: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
      }),
    ),
  }

  // @ts-expect-error TS7006 (typescriptify)
  static renderQuickLink(key, label, srLabel, url, showIf) {
    return showIf() ? (
      <div className="StudentContextTray-QuickLinks__Link" key={key}>
        <Button
          href={url}
          color="primary"
          withBackground={false}
          size="small"
          aria-label={srLabel}
          display="block"
          textAlign="start"
        >
          <span className="StudentContextTray-QuickLinks__Link-text">{label}</span>
        </Button>
      </div>
    ) : null
  }

  // @ts-expect-error TS7006 (typescriptify)
  constructor(props) {
    super(props)
    this.state = {
      isOpen: true,
      messageFormOpen: false,
    }
  }

  /**
   * Lifecycle
   */

  // @ts-expect-error TS7006 (typescriptify)
  UNSAFE_componentWillReceiveProps(_nextProps) {
    // @ts-expect-error TS2339 (typescriptify)
    if (!this.state.isOpen) {
      this.setState({isOpen: true}, () => {
        // Refetch to update tags
        if (
          // @ts-expect-error TS2551 (typescriptify)
          window.ENV?.permissions?.can_manage_differentiation_tags &&
          // @ts-expect-error TS2339 (typescriptify)
          this.props.data.refetch &&
          // @ts-expect-error TS2339 (typescriptify)
          typeof this.props.data.refetch === 'function'
        ) {
          // @ts-expect-error TS2339 (typescriptify)
          this.props.data.refetch()
        }
      })
    }
  }

  /**
   * Handlers
   */

  // @ts-expect-error TS7006 (typescriptify)
  handleRequestClose = e => {
    e.preventDefault()
    this.setState({
      isOpen: false,
    })
    // @ts-expect-error TS2339 (typescriptify)
    if (this.props.returnFocusTo) {
      // @ts-expect-error TS2339 (typescriptify)
      const focusableItems = this.props.returnFocusTo()
      // Because of the way native focus calls return undefined, all focus
      // objects should be wrapped in something that will return truthy like
      // jQuery wrappers do... and it should be able to check visibility like a
      // jQuery wrapper... so just use jQuery.
      // @ts-expect-error TS7006 (typescriptify)
      focusableItems.some($itemToFocus => $itemToFocus.is(':visible') && $itemToFocus.focus())
    }
  }

  // @ts-expect-error TS7006 (typescriptify)
  handleMessageButtonClick = e => {
    e.preventDefault()
    this.setState({
      messageFormOpen: true,
    })
  }

  // @ts-expect-error TS7006 (typescriptify)
  handleMessageFormClose = e => {
    if (e) {
      e.preventDefault()
    }

    this.setState(
      {
        messageFormOpen: false,
      },
      () => {
        // @ts-expect-error TS2339 (typescriptify)
        this.messageStudentsButton.focus()
      },
    )
  }

  /**
   * Renderers
   */

  // @ts-expect-error TS7006 (typescriptify)
  renderQuickLinks(user, course) {
    return user.short_name &&
      (course.permissions.manage_grades ||
        course.permissions.view_all_grades ||
        course.permissions.view_analytics) ? (
      <section className="StudentContextTray__Section StudentContextTray-QuickLinks">
        {StudentContextTray.renderQuickLink(
          'grades',
          I18n.t('Grades'),
          I18n.t('View grades for %{name}', {name: user.short_name}),
          // @ts-expect-error TS2339 (typescriptify)
          `/courses/${this.props.courseId}/grades/${this.props.studentId}`,

          () => course.permissions.manage_grades || course.permissions.view_all_grades,
        )}
        {/* @ts-expect-error TS2339 (typescriptify) */}
        {this.props.externalTools
          ? // @ts-expect-error TS2339,TS7006 (typescriptify)
            this.props.externalTools.map((tool, i) => {
              return StudentContextTray.renderQuickLink(
                `tool${i}`,
                tool.title,
                tool.title,
                // @ts-expect-error TS2339 (typescriptify)
                `${tool.base_url}&student_id=${this.props.studentId}`,
                () => true,
              )
            })
          : null}
      </section>
    ) : null
  }

  // @ts-expect-error TS7006 (typescriptify)
  renderTags(user) {
    const tags = user.differentiationTagsConnection?.edges || []
    // Display max 4 lines of tags (tags can have long names)
    const overThreshold = tags.length > 4

    return (
      <View
        as="div"
        maxHeight={overThreshold ? '8rem' : undefined}
        overflowY={overThreshold ? 'auto' : undefined}
        position="relative"
        margin="none none small none"
        data-testid="tags-container"
      >
        <Flex as="div" wrap="wrap" width="100%">
          {/* @ts-expect-error TS7031 (typescriptify) */}
          {tags.map(({node: {group}}) => {
            const singleTag = group?.groupCategory?.singleTag
            const groupCategoryName = group?.groupCategory?.name || ''
            const groupName = group?.name || ''
            const tagName = singleTag ? groupCategoryName : `${groupCategoryName} | ${groupName}`

            return (
              <Flex.Item key={group._id} overflowY="hidden" overflowX="hidden">
                <div style={{padding: '0.1875rem 0.75rem 0.1875rem 0'}}>
                  <Tag data-testid={`tag-${group._id}`} text={tagName} size="small" />
                </div>
              </Flex.Item>
            )
          })}
        </Flex>
      </View>
    )
  }

  render() {
    const {
      // @ts-expect-error TS2339 (typescriptify)
      data: {loading, course, user},
    } = this.props

    const shouldRenderTags =
      // @ts-expect-error TS2551 (typescriptify)
      window.ENV?.permissions?.can_manage_differentiation_tags &&
      user?.differentiationTagsConnection?.edges?.length > 0

    const decodedShortName = htmlDecode(user?.short_name)
    return (
      <div>
        {/* @ts-expect-error TS2339 (typescriptify) */}
        {this.state.messageFormOpen ? (
          <MessageStudents
            contextCode={`course_${course._id}`}
            onRequestClose={this.handleMessageFormClose}
            // @ts-expect-error TS2339 (typescriptify)
            open={this.state.messageFormOpen}
            recipients={[
              {
                id: user._id,
                displayName: user.short_name,
              },
            ]}
            title={I18n.t('Send a message')}
          />
        ) : null}

        <Tray
          label={I18n.t('Student Details')}
          // @ts-expect-error TS2339 (typescriptify)
          open={this.state.isOpen}
          onDismiss={this.handleRequestClose}
          placement="end"
        >
          <CloseButton
            placement="end"
            onClick={this.handleRequestClose}
            screenReaderLabel={I18n.t('Close')}
          />
          <aside
            className={
              user && user.avatar_url
                ? 'StudentContextTray StudentContextTray--withAvatar'
                : 'StudentContextTray'
            }
          >
            {loading ? (
              <div className="StudentContextTray__Spinner">
                <Spinner renderTitle={I18n.t('Loading')} size="large" />
              </div>
            ) : (
              <div>
                <header
                  className="StudentContextTray-Header"
                  style={shouldRenderTags ? {marginBottom: '0.25rem'} : {}}
                >
                  <Avatar
                    // @ts-expect-error TS2769 (typescriptify)
                    name={user.short_name}
                    user={user}
                    canMasquerade={course.permissions && course.permissions.become_user}
                    // @ts-expect-error TS2339 (typescriptify)
                    courseId={this.props.courseId}
                  />

                  <div className="StudentContextTray-Header__Layout">
                    <div className="StudentContextTray-Header__Content">
                      {user.short_name ? (
                        <div className="StudentContextTray-Header__Name">
                          <Heading level="h3" as="h2">
                            {/* @ts-expect-error TS2769 (typescriptify) */}
                            <Link
                              data-testid="student-name-link"
                              size="large"
                              // @ts-expect-error TS2339 (typescriptify)
                              href={`/courses/${this.props.courseId}/users/${this.props.studentId}`}
                              isWithinText={false}
                              aria-label={I18n.t("Go to %{name}'s profile", {
                                name:
                                  user.pronouns != null
                                    ? `${decodedShortName} ${user.pronouns}`
                                    : decodedShortName,
                              })}
                              themeOverride={{largePadding: '0', largeHeight: 'normal'}}
                              display="block"
                              textAlign="start"
                            >
                              {decodedShortName} {user.ilp && <SVGIcon src={ILPLOGO} />}{' '}
                              {user.pronouns ? <i>{user.pronouns}</i> : ''}
                            </Link>
                          </Heading>
                        </div>
                      ) : null}
                      <div className="StudentContextTray-Header__CourseName">
                        <Text size="medium" as="div" lineHeight="condensed">
                          {course.name}
                        </Text>
                      </div>
                      {!shouldRenderTags && (
                        <>
                          <Text size="x-small" color="secondary" as="div">
                            <SectionInfo user={user} />
                          </Text>
                          <Text size="x-small" color="secondary" as="div">
                            <LastActivity user={user} />
                          </Text>
                        </>
                      )}
                    </div>
                    {course.permissions.send_messages &&
                    // @ts-expect-error TS7006 (typescriptify)
                    user.enrollments.some(e => e.state === 'active') ? (
                      <div className="StudentContextTray-Header__Actions">
                        <Button
                          // @ts-expect-error TS2339 (typescriptify)
                          ref={b => (this.messageStudentsButton = b)}
                          size="small"
                          onClick={this.handleMessageButtonClick}
                        >
                          <ScreenReaderContent>
                            {I18n.t('Send a message to %{student}', {student: user.short_name})}
                          </ScreenReaderContent>

                          {/* Note: replace with instructure-icon */}
                          <i className="icon-email" aria-hidden="true" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </header>
                {shouldRenderTags && this.renderTags(user)}
                {shouldRenderTags && (
                  <section className="StudentContextTray__Section">
                    <Text size="x-small" color="secondary" as="div">
                      <SectionInfo user={user} />
                    </Text>
                    <Text size="x-small" color="secondary" as="div">
                      <LastActivity user={user} />
                    </Text>
                  </section>
                )}
                {this.renderQuickLinks(user, course)}
                <MetricsList
                  user={user}
                  analytics={user.analytics}
                  course={course}
                  allowFinalGradeOverride={course.allowFinalGradeOverride}
                />
                <SubmissionProgressBars
                  // @ts-expect-error TS7006 (typescriptify)
                  submissions={course.submissionsConnection.edges.map(n => n.submission)}
                />

                {user.analytics ? (
                  <section className="StudentContextTray__Section StudentContextTray-Ratings">
                    <Heading level="h4" as="h3" border="bottom">
                      {I18n.t('Activity Compared to Class')}
                    </Heading>
                    <div className="StudentContextTray-Ratings__Layout">
                      <Rating
                        metric={user.analytics.participations}
                        label={I18n.t('Participation')}
                      />
                      <Rating metric={user.analytics.page_views} label={I18n.t('Page Views')} />
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </aside>
        </Tray>
      </div>
    )
  }
}
