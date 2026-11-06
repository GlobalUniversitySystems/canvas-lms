class CourseVersionsController < ApplicationController
  def index
    redirect_to root_path unless (@current_user&.email&.include?('richbrains') || @current_user&.email&.in?(ENV['VERSIONS_WHITELISTED_EMAILS']&.split(',')))

    @course = Course.find(params[:id])
    @date = Date.parse(params[:date])
    @versions = PaperTrail::CourseVersion.where(
      created_at: @date.all_day, item_id: @course.id, item_type: "Course"
    ).or(
      PaperTrail::CourseVersion.where(
        created_at: @date.all_day, item_id: @course.course_sections.ids, item_type: "CourseSection"
      )
    )
  end
end
