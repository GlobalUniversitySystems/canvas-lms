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
import {shape, arrayOf, string, func} from 'prop-types'
import {debounce} from 'lodash'
import {useScope as useI18nScope} from '@canvas/i18n'
import {ScreenReaderContent} from '@instructure/ui-a11y-content'
import CoursesStore from '../store/CoursesStore'
import TermsStore from '../store/TermsStore'
import AccountsTreeStore from '../store/AccountsTreeStore'
import CoursesList from './CoursesList'
import CoursesToolbar from './CoursesToolbar'
import SearchMessage from './SearchMessage'
import SRSearchMessage from './SRSearchMessage'
import {SEARCH_DEBOUNCE_TIME} from './UsersPane'
import axios from '@canvas/axios'

const I18n = useI18nScope('account_course_user_search')

const MIN_SEARCH_LENGTH = 2
const stores = [CoursesStore, TermsStore, AccountsTreeStore]

const defaultFilters = {
  enrollment_term_id: '',
  search_term: '',
  sort: 'sis_course_id',
  order: 'asc',
  search_by: 'course',
  hide_concluded: true,
  page: null,
}

class CoursesPane extends React.Component {
  static propTypes = {
    roles: arrayOf(shape({id: string.isRequired})).isRequired,
    queryParams: shape().isRequired,
    onUpdateQueryParams: func.isRequired,
    accountId: string.isRequired,
  }

  constructor() {
    super()

    this.state = {
      filters: defaultFilters,
      draftFilters: defaultFilters,
      errors: {},
      selectedCourse: [],
      isAllCoursesSelect: false,
      previousCourses: {
        data: [],
        loading: true,
      },
      srMessageDisplayed: false,
    }

    // Doing this here because the class property version didn't work :(
    this.debouncedApplyFilters = debounce(this.onApplyFilters, SEARCH_DEBOUNCE_TIME)
  }

  UNSAFE_componentWillMount() {
    stores.forEach(s => s.addChangeListener(this.refresh))
    const filters = {...defaultFilters, ...this.props.queryParams}
    this.setState({filters, draftFilters: filters})
  }

  componentDidMount() {
    this.fetchCourses()
    TermsStore.loadAll()
  }

  componentWillUnmount() {
    stores.forEach(s => s.removeChangeListener(this.refresh))
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const filters = {...defaultFilters, ...nextProps.queryParams}
    this.setState({filters, draftFilters: filters})
  }

  fetchCourses = () => {
    this.updateQueryString()
    CoursesStore.load(this.state.filters)
  }

  setPage = page => {
    this.setState(
      oldState => ({
        filters: {...oldState.filters, page},
        previousCourses: CoursesStore.get(oldState.filters),
      }),
      this.fetchCourses
    )
  }

  onUpdateFilters = newFilters => {
    this.setState(
      oldState => ({
        errors: {},
        draftFilters: {...oldState.draftFilters, ...newFilters, page: null},
      }),
      this.debouncedApplyFilters
    )
  }

  onApplyFilters = () => {
    const filters = this.state.draftFilters
    if (filters.search_term && filters.search_term.trim().length < MIN_SEARCH_LENGTH) {
      this.setState({
        errors: {
          search_term: I18n.t('Search term must be at least %{num} characters', {
            num: MIN_SEARCH_LENGTH,
          }),
        },
      })
    } else {
      this.setState({knownLastPage: undefined, filters, errors: {}}, this.fetchCourses)
    }
  }

  onChangeSort = column => {
    const {sort, order} = this.state.filters
    const newOrder = column === sort && order === 'asc' ? 'desc' : 'asc'

    this.setState(oldState => {
      const newFilters = {...oldState.filters, sort: column, order: newOrder}
      return {
        knownLastPage: undefined,
        filters: newFilters,
        previousCourses: CoursesStore.get(oldState.filters),
      }
    }, this.fetchCourses)
  }

  onChangeCheckbox = ({
    courseId,
  }) => {
    try {
      const {selectedCourse} = this.state
      const isCourseAlreadySelected = selectedCourse.includes(courseId)
      if (isCourseAlreadySelected) {
        const filteredCoursesIds = selectedCourse.filter((currentId) => currentId !== courseId)
        return this.setState({selectedCourse: filteredCoursesIds})
      }
      const updatedCourseIds = [...selectedCourse, courseId]
      this.setState({selectedCourse: updatedCourseIds})
    } catch (error) {
      console.log(error);
    }
  }

  syncGrades = () => {
    const {selectedCourse} = this.state;

    if (!selectedCourse.length) {
      $.flashError("choose at least one course")
      return
    }

    axios.post('/details/sis_bulk_publish ', {
      selected_course: selectedCourse
    })
      .then(() => {
        $.flashMessage("courses synced")
      })
      .catch(() => {
        $.flashError("there was some kind of synchronization error")
      })
  }


  refresh = () => {
    const courses = CoursesStore.get(this.state.filters)
    const lastPage = courses?.links?.last?.page
    if (lastPage && !this.state.knownLastPage) this.setState({knownLastPage: lastPage})
    this.forceUpdate()
  }

  updateQueryString = () => {
    const differences = Object.keys(this.state.filters).reduce((memo, key) => {
      const value = this.state.filters[key]
      if (value !== defaultFilters[key]) {
        return {...memo, [key]: value}
      }
      return memo
    }, {})
    this.props.onUpdateQueryParams(differences)
  }

  render() {
    const {filters, draftFilters, errors, selectedCourse} = this.state
    let courses = CoursesStore.get(filters)
    if (!courses || !courses.data) {
      courses = this.state.previousCourses
    }
    const terms = TermsStore.get()
    const isLoading = !(courses && !courses.loading)
    const selectSyncActive = ENV.PERMISSIONS.bulk_push_to_sis;

    return (
      <div>
        <ScreenReaderContent>
          <h1>{I18n.t('Courses')}</h1>
        </ScreenReaderContent>

        <CoursesToolbar
          onUpdateFilters={this.onUpdateFilters}
          onApplyFilters={this.onApplyFilters}
          syncGrades={this.syncGrades}
          selectSyncActive={selectSyncActive}
          terms={terms}
          isLoading={isLoading}
          errors={errors}
          draftFilters={draftFilters}
          toggleSRMessage={(show = false) => {
            this.setState({srMessageDisplayed: show})
          }}
        />

        <CoursesList
          onChangeSort={this.onChangeSort}
          selectSyncActive={selectSyncActive}
          onChangeCheckbox={this.onChangeCheckbox}
          selectedCourse={selectedCourse}
          accountId={this.props.accountId}
          courses={courses.data}
          roles={this.props.roles}
          sort={filters.sort}
          order={filters.order}
        />

        <SearchMessage
          collection={courses}
          setPage={this.setPage}
          knownLastPage={this.state.knownLastPage}
          noneFoundMessage={I18n.t('No courses found')}
        />
        {this.state.srMessageDisplayed && (
          <SRSearchMessage collection={courses} dataType="Course" />
        )}
      </div>
    )
  }
}

export default CoursesPane
