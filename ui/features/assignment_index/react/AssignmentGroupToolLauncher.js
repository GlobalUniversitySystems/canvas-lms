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

import React from 'react'
import PropTypes from 'prop-types'
import axios from '@canvas/axios'
import {useScope as useI18nScope} from '@canvas/i18n'
import ExternalToolModalLauncher from '@canvas/external-tools/react/components/ExternalToolModalLauncher'

const I18n = useI18nScope('assignment_index_menu')

// Renders one "Create <Tool>" link per course_assignments_menu external tool,
// scoped to a single assignment group. Clicking a link launches the tool's
// deep-linking modal with assignmentGroupId set, so any assignment the tool
// creates is placed directly into this assignment group instead of Canvas's
// default (first) group.
export default class AssignmentGroupToolLauncher extends React.Component {
  static propTypes = {
    contextType: PropTypes.string.isRequired,
    contextId: PropTypes.number.isRequired,
    assignmentGroupId: PropTypes.string.isRequired,
    assignmentGroupName: PropTypes.string.isRequired
  }

  state = {
    externalTools: [],
    modalIsOpen: false,
    selectedTool: null
  }

  componentDidMount() {
    const toolsUrl = `/api/v1/${this.props.contextType}s/${this.props.contextId}/lti_apps/launch_definitions?placements[]=course_assignments_menu`
    axios
      .get(toolsUrl)
      .then(response => this.setState({externalTools: response.data}))
      .catch(() => {})
  }

  onLaunchTool = tool => e => {
    e.preventDefault()
    this.setState({selectedTool: tool, modalIsOpen: true})
  }

  closeModal = () => {
    this.setState({modalIsOpen: false})
  }

  render() {
    if (!this.state.externalTools.length) return null

    return (
      <React.Fragment>
        {this.state.externalTools.map(tool => (
          <a
            key={tool.definition_id}
            href="#"
            className="Button--icon-action"
            title={I18n.t('Create %{toolName} in %{groupName}', {
              toolName: tool.name,
              groupName: this.props.assignmentGroupName
            })}
            onClick={this.onLaunchTool(tool)}
          >
            <span className="screenreader-only">
              {I18n.t('Create %{toolName} in %{groupName}', {
                toolName: tool.name,
                groupName: this.props.assignmentGroupName
              })}
            </span>
            {I18n.t('Create %{toolName} in %{groupName}', {
              toolName: tool.name,
              groupName: this.props.assignmentGroupName
            })}
          </a>
        ))}
        {this.state.modalIsOpen && (
          <ExternalToolModalLauncher
            tool={this.state.selectedTool}
            isOpen={this.state.modalIsOpen}
            onRequestClose={this.closeModal}
            contextType={this.props.contextType}
            contextId={this.props.contextId}
            launchType="course_assignments_menu"
            assignmentGroupId={this.props.assignmentGroupId}
            title={
              this.state.selectedTool &&
              this.state.selectedTool.placements.course_assignments_menu.title
            }
          />
        )}
      </React.Fragment>
    )
  }
}
