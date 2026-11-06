module AccountReports
  class AssignmentReports
    include ReportHelper

    def initialize(account_report)
      @account_report = account_report
      extra_text_term(@account_report)
    end

    def assignment_export
      headers = []
      headers << I18n.t("Course ID")
      headers << I18n.t("Course Name")
      headers << I18n.t("Assignment Group ID")
      headers << I18n.t("Assignment Group Name")
      headers << I18n.t("Assignment Group Weightage")
      headers << I18n.t("Assignment ID")
      headers << I18n.t("Assignment Name")
      headers << I18n.t("Assignment Created Date")
      headers << I18n.t("Assignment Start Date")
      headers << I18n.t("Assignment Due Date")
      headers << I18n.t("External Tool Link")

      courses = root_account.all_courses.active
      courses = add_term_scope(courses)
      courses = add_course_sub_account_scope(courses)

      write_report headers do |csv|
        total = courses.count(:all)
        GuardRail.activate(:primary) { AccountReport.where(id: @account_report.id).update_all(total_lines: total) }

        courses.preload(:assignment_groups).find_each do |course|
          assignment_groups = course.assignment_groups.active
          assignment_groups.each do |group|
            group.assignments.active.each do |assignment|
              row = []
              row << course.id
              row << course.name
              row << group.id
              row << group.name
              row << group.group_weight
              row << assignment.id
              row << assignment.name
              row << default_timezone_format(assignment.created_at)
              row << default_timezone_format(assignment.unlock_at)
              row << default_timezone_format(assignment.due_at)
              row << (assignment.submission_types == "external_tool")
              csv << row
            end
          end
        end
      end
    end
  end
end

