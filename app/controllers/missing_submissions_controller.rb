class MissingSubmissionsController < ApplicationController
  before_action :require_context
  before_action :require_user

  # @API List students with missing submissions
  #
  # Returns a JSON array of entries for every (student, Turnitin assignment) pair
  # in the course where the student has not yet submitted (i.e. submitted_at is null).
  # Only assignments delivered via the Turnitin external tool are included.
  #
  # @argument course_id [Required, Integer]
  #   The id of the course to query.
  #
  # @example_request
  #   curl https://<canvas>/api/v1/courses/<course_id>/missing_submissions \
  #        -H 'Authorization: Bearer <token>'
  #
  # @example_response
  #   [
  #     {
  #       "course_id": 1,
  #       "assignment_group": "Essays",
  #       "assignment_name": "Research Paper",
  #       "assignment_link": "https://<canvas>/courses/1/gradebook/speed_grader?assignment_id=10&student_id=99",
  #       "start_date": "2026-01-10T00:00:00Z",
  #       "due_date": "2026-02-01T23:59:59Z",
  #       "student_id": 99,
  #       "student_identifier": "sis_student_001",
  #       "upload_at": "2026-01-30T14:22:00Z"
  #     }
  #   ]
  #
  # @API List assignments
  #
  # Returns a JSON array of all active assignments in the course,
  # including their assignment group, a link to the assignment page,
  # and a flag indicating whether the assignment uses Turnitin.
  #
  # @argument course_id [Required, Integer]
  #   The id of the course to query.
  #
  # @example_request
  #   curl https://<canvas>/api/v1/courses/<course_id>/turnitin_assignments \
  #        -H 'Authorization: Bearer <token>'
  #
  # @example_response
  #   [
  #     {
  #       "course_id": 1,
  #       "assignment_group": "Essays",
  #       "assignment_name": "Research Paper",
  #       "turnitin_enabled": true,
  #       "assignment_link": "https://<canvas>/courses/1/assignments/10"
  #     }
  #   ]
  #
  def assignments
    return render_unauthorized_action unless authorized_action(@context, @current_user, [:manage_grades, :view_all_grades])

    all_assignments = @context.assignments
                              .active
                              .preload(:assignment_group, :external_tool_tag)

    result = all_assignments.map do |assignment|
      is_turnitin = assignment.submission_types == "external_tool" &&
                   assignment.external_tool_tag&.url&.include?("turnitin")
      {
        course_id:        @context.id,
        assignment_group: assignment.assignment_group&.name,
        assignment_name:  assignment.name,
        turnitin_enabled: is_turnitin,
        assignment_link:  "#{request.base_url}/courses/#{@context.id}/assignments/#{assignment.id}"
      }
    end

    render json: result
  end

  def index
    return render_unauthorized_action unless authorized_action(@context, @current_user, [:manage_grades, :view_all_grades])

    assignments = @context.assignments
                          .active
                          .preload(:assignment_group, :external_tool_tag)

    return render json: [] if assignments.empty?

    # Load all active student enrollments with user + pseudonyms in one shot
    student_enrollments = @context.enrollments
                                  .active
                                  .where(type: "StudentEnrollment")
                                  .preload(user: :pseudonyms)

    return render json: [] if student_enrollments.empty?

    student_ids  = student_enrollments.map(&:user_id)
    students_map = student_enrollments.index_by(&:user_id)

    assignment_ids = assignments.map(&:id)

    # Bulk-load submitted_at for all (assignment, student) pairs in one query.
    submission_map = Submission
                     .where(assignment_id: assignment_ids, user_id: student_ids)
                     .pluck(:assignment_id, :user_id, :submitted_at)
                     .each_with_object({}) { |(a_id, u_id, sub_at), h| h[[a_id, u_id]] = sub_at }

    # Per-student effective due dates (respects overrides, differentiated assignments, etc.)
    # Structure: { assignment_id => { student_id => { due_at:, unlock_at:, ... } } }
    effective_due_dates = EffectiveDueDates.for_course(@context, assignments).to_hash

    result = []

    assignments.each do |assignment|
      is_turnitin = assignment.submission_types == "external_tool" &&
                   assignment.external_tool_tag&.url&.include?("turnitin")

      # Per-assignment student due-date map (may be empty if no overrides recorded yet)
      assignment_dates = effective_due_dates[assignment.id] || {}

      student_ids.each do |student_id|
        enrollment = students_map[student_id]
        user       = enrollment.user

        # Prefer SIS user id; fall back to Canvas user id as string
        pseudonym          = user.pseudonyms
                                 .select { |p| p.account_id == @context.root_account_id }
                                 .min_by { |p| p.sis_user_id.nil? ? 1 : 0 }
        student_identifier = pseudonym&.sis_user_id.presence || user.id.to_s

        # Per-student effective dates from overrides; fall back to assignment defaults
        student_dates = assignment_dates[student_id]
        due_date      = student_dates ? student_dates[:due_at]    : assignment.due_at
        start_date    = student_dates ? student_dates[:unlock_at] : assignment.unlock_at

        result << {
          course_id:          @context.id,
          assignment_group:   assignment.assignment_group&.name,
          assignment_name:    assignment.name,
          assignment_link:    is_turnitin ? assignment_link(assignment.id, student_id) : nil,
          start_date:         start_date,
          due_date:           due_date,
          student_id:         student_id,
          student_identifier: student_identifier,
          upload_at:          submission_map[[assignment.id, student_id]]
        }
      end
    end

    render json: result
  end

  private

  def assignment_link(assignment_id, student_id)
    "#{request.base_url}/courses/#{@context.id}/gradebook/speed_grader" \
      "?assignment_id=#{assignment_id}&student_id=#{student_id}"
  end
end
