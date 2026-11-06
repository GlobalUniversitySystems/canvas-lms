#
# Copyright (C) 2013 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.
#

require 'account_reports/report_helper'

module AccountReports

  class CourseReports
    include ReportHelper

    def initialize(account_report)
      @account_report = account_report
      extra_text_term(@account_report)
    end

    def default_courses
      root_account.all_courses.
        select([:id, :sis_source_id, :name, :course_code, :start_at,
                :conclude_at, :restrict_enrollments_to_course_dates])
    end

    def recently_deleted
      csv(default_courses.where("workflow_state = 'deleted' AND updated_at > ?",
                                30.days.ago))
    end

    def public_courses
      csv(default_courses.active.where(is_public: true))
    end

    def student_enrollments
      headers = []
      headers << 'course_id'
      headers << 'course_name'
      headers << 'number_of_students'

      account = Account.find(sub_account_id) rescue root_account

      account_courses = account.courses.active

      courses = account_courses.select("courses.id, courses.name, count(enrollments.id) as ecount").joins('right outer JOIN "enrollments" ON "enrollments"."course_id" = "courses"."id"').where("enrollments.type in ('StudentEnrollment') and enrollments.workflow_state NOT IN ('rejected', 'completed', 'deleted', 'inactive')").group('courses.id')

      write_report headers do |csv|
        courses.each do |c|
          row = []

          row << c&.id
          row << c&.name
          row << c&.ecount

          csv << row
        end

        (account_courses - courses).each do |c|
          row = []

          row << c&.id
          row << c&.name
          row << 0

          csv << row
        end
      end
    end

    def page_views_for_sub_account
      headers = []
      headers << 'course_id'
      headers << 'course_name'
      headers << 'page_views'
      headers << 'participations'

      account = Account.find(sub_account_id)
      admin = User.first

      courses = account.courses.active

      data = {}

      courses.each do |course|
        data[course.id] = Analytics::Course.new(admin, course).page_views_by_student.values
      end


      write_report headers do |csv|
        data.each do |course_id, data_array|
          row = []

          row << course_id
          row << courses.find(course_id)&.name
          row << data_array.sum { |h| h[:page_views] }
          row << data_array.sum { |h| h[:participations] }

          csv << row
        end
      end
    end

    def page_views_for_course
      headers = []
      headers << 'course_id'
      headers << 'course_name'
      headers << 'page'
      headers << 'views'

      course = Course.find(course_id)
      students = course.students
      admin = User.first

      data = []

      students.each do |s|
        participations = Analytics::StudentInCourse.new(admin, course, s).participations
        data << participations if participations.present?
      end

      data.flatten!

      urls = data.map { |h| h['url'] }

      hash = Hash.new(0)

      urls.each do |v|
        hash[v] += 1
      end

      write_report headers do |csv|
        hash.each do |k, v|
          row = []

          row << course_id
          row << course&.name
          row << k
          row << v

          csv << row
        end
      end
    end

    # def course_page_views
    #   headers = []
    #   headers << 'course name'
    #   headers << 'page url'
    #   headers << 'counter'
    #
    #   courses = root_account.all_courses.active.to_a
    #   ids = courses.pluck(:id)
    #
    #   students_ids = students.pluck(:id)
    #
    #   pages = PageView.select('count(request_id) as counter, page_views.url, page_views.context_id').where(context_type: 'Course', context_id: ids, user_id: students_ids).where('page_views.created_at > ? and page_views.created_at < ?', start_at, end_at).group('page_views.url, page_views.context_id').order('context_id desc')
    #

    # end
    #
    # def students
    #   User.all.to_a.select do |u|
    #     roles = u.roles(root_account)
    #
    #     u if roles.size == 2 && roles.sort == ["student", "user"]
    #   end
    # end

    def unpublished_courses
      csv(default_courses.where(:workflow_state => ['claimed', 'created']))
    end

    def course_storage
      courses = root_account.all_courses.active.preload(:account)
      courses = add_course_sub_account_scope(courses)
      courses = add_term_scope(courses)


      headers = []
      headers << I18n.t('id')
      headers << I18n.t('sis id')
      headers << I18n.t('short name')
      headers << I18n.t('name')
      headers << I18n.t('account id')
      headers << I18n.t('account sis id')
      headers << I18n.t('account name')
      headers << I18n.t('storage used in MB')
      headers << I18n.t('sum of all files in MB')
      write_report headers do |csv|

        total = courses.count(:all)
        Shackles.activate(:master) { AccountReport.where(id: @account_report.id).update_all(total_lines: total) }

        courses.find_each do |c|
          row = []
          row << c.id
          row << c.sis_source_id
          row << c.course_code
          row << c.name
          row << c.account_id
          row << c.account.sis_source_id
          row << c.account.name
          row << c.storage_quota_used_mb.round(2)
          scope = c.attachments.active
          min = Attachment.minimum_size_for_quota
          all_course_files_size = scope.sum("COALESCE(CASE when size < #{min} THEN #{min} ELSE size END, 0)").to_i
          row << (all_course_files_size.to_f / 1.megabyte).round(2)
          csv << row
        end
      end
    end

    def csv(courses)
      courses = add_course_sub_account_scope(courses)
      courses = add_term_scope(courses)

      headers = []
      headers << I18n.t('#account_reports.report_header_id', 'id')
      headers << I18n.t('#account_reports.report_header_sis_id', 'sis id')
      headers << I18n.t('#account_reports.report_header_short_name', 'short name')
      headers << I18n.t('#account_reports.report_header_name', 'name')
      headers << I18n.t('#account_reports.report_header_start_date', 'start date')
      headers << I18n.t('#account_reports.report_header_end_date', 'end date')
      write_report headers do |csv|

        total = courses.count(:all)
        Shackles.activate(:master) { AccountReport.where(id: @account_report.id).update_all(total_lines: total) }

        courses.find_each do |c|
          row = []
          row << c.id
          row << c.sis_source_id
          row << c.course_code
          row << c.name

          if c.restrict_enrollments_to_course_dates
            row << default_timezone_format(c.start_at)
            row << default_timezone_format(c.conclude_at)
          else
            row << nil
            row << nil
          end

          csv << row
        end
      end
    end

    def unused_courses()
      courses = root_account.all_courses.active.
        select("courses.id, courses.name, courses.course_code,
                courses.sis_source_id, courses.created_at,
           CASE WHEN courses.workflow_state = 'claimed' THEN 'unpublished'
                WHEN courses.workflow_state = 'created' THEN 'unpublished'
                WHEN courses.workflow_state = 'completed' THEN 'concluded'
                WHEN courses.workflow_state = 'available' THEN 'active'
            END AS course_state").
        where("NOT EXISTS (SELECT NULL
                           FROM #{Assignment.quoted_table_name} a
                           WHERE a.context_id = courses.id
                             AND a.context_type = 'Course'
                             AND a.workflow_state <> 'deleted')
           AND NOT EXISTS (SELECT NULL
                           FROM #{Attachment.quoted_table_name} at
                           WHERE at.context_id = courses.id
                             AND at.context_type = 'Course'
                             AND at.file_state <> 'deleted')
           AND NOT EXISTS (SELECT NULL
                           FROM #{DiscussionTopic.quoted_table_name} d
                           WHERE d.context_id = courses.id
                             AND d.context_type = 'Course'
                             AND d.workflow_state <> 'deleted')
           AND NOT EXISTS (SELECT NULL
                           FROM #{ContextModule.quoted_table_name} m
                           WHERE m.context_id = courses.id
                             AND m.context_type = 'Course'
                             AND m.workflow_state <> 'deleted')
           AND NOT EXISTS (SELECT NULL
                           FROM #{Quizzes::Quiz.quoted_table_name} q
                           WHERE q.context_id = courses.id
                             AND q.context_type = 'Course'
                             AND q.workflow_state <> 'deleted')
           AND NOT EXISTS (SELECT NULL
                           FROM #{WikiPage.quoted_table_name} w
                           WHERE w.wiki_id = courses.wiki_id
                             AND w.workflow_state <> 'deleted')")

      courses = add_term_scope(courses)
      courses = add_course_sub_account_scope(courses)

      headers = []
      headers << I18n.t('#account_reports.report_header_course_id', 'course id')
      headers << I18n.t('#account_reports.report_header_course_sis_id', 'course sis id')
      headers << I18n.t('#account_reports.report_header_short_name', 'short name')
      headers << I18n.t('#account_reports.report_header_long_name', 'long name')
      headers << I18n.t('#account_reports.report_header_status', 'status')
      headers << I18n.t('#account_reports.report_header_created_at', 'created at')

      write_report headers do |csv|
        courses.find_each do |c|
          row = []
          row << c["id"]
          row << c["sis_source_id"]
          row << c["course_code"]
          row << c["name"]
          row << c["course_state"]
          row << default_timezone_format(c["created_at"])
          csv << row
        end
      end
    end
  end

end
