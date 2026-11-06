class MissingSubmissionsGrader
  def self.process_missing_submissions
    MissingSubmissionsGrader.new.process_missing_submissions
  end

  def process_missing_submissions
    eligible_submissions.find_in_batches do |submissions|
      submissions.each do |submission|
        submission.late_policy_status = "missing"
        submission.save
      end
    end
  end

  private

  def eligible_submissions
    course_ids_with_late_policy = LatePolicy.where(missing_submission_deduction_enabled: true, missing_submission_deduction: 100).pluck(:course_id)
    eligible_courses = Course.eligible_for_missing.where(id: course_ids_with_late_policy)
    eligible_assignments = Assignment.published.where(course: eligible_courses)

    now = Time.zone.now
    unsubmitted = Submission.unsubmitted.where(
      assignment: eligible_assignments,
      score: nil,
      grade: nil,
      cached_due_date: 1.day.ago(now)..now
    )

    unsubmitted
  end
end
