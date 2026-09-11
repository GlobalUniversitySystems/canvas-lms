class AddIsLessonToCourseSection < ActiveRecord::Migration[5.2]
  tag :predeploy

  def change
    add_column :course_sections, :is_lesson, :boolean, default: false
  end
end