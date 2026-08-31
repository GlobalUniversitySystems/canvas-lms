class RollcallSectionsController < ActionController::Base
  def index
    course = Course.find(params[:course_id])
    sections = course.active_course_sections.order(CourseSection.best_unicode_collation_key("name"), :id)

    json_response = sections.map { |s| {event_id: s.event_id, section_id: s.id} }&.as_json

    render json: json_response
  end
end
