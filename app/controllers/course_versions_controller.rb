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
    ).or(
      PaperTrail::CourseVersion.where(
        created_at: @date.all_day, item_id: @course.post_policies.ids, item_type: "PostPolicy"
      )
    ).or(
      PaperTrail::CourseVersion.where(
        created_at: @date.all_day, item_id: @course.late_policy&.id, item_type: "LatePolicy"
      )
    )
    @versions = @versions.where.not(object_changes: nil)
  end

  def upload_assets_to_cdn
    Rails.application.load_tasks
    Rake::Task['canvas:cdn:upload_to_s3'].invoke

    render json: { message: 'Assets uploaded to CDN' }
  end
end
