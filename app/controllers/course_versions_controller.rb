class CourseVersionsController < ApplicationController
  def index
    redirect_to root_path unless @current_user&.email&.include?('richbrains')

    @course = Course.find(params[:id])
    @date = Date.parse(params[:date])
    @versions = PaperTrail::CourseVersion.where(
      created_at: @date.all_day, item_id: @course.id, item_type: "Course"
    ).or(
      PaperTrail::CourseVersion.where(
        created_at: @date.all_day, item_id: @course.course_sections.ids, item_type: "CourseSection"
      )
    ).or(
      PaperTrail::CourseVersion.where(
        created_at: @date.all_day, item_id: @course.late_policy&.id, item_type: "LatePolicy"
      )
    )
    @versions = @versions.where.not(object_changes: nil)
  end
end
