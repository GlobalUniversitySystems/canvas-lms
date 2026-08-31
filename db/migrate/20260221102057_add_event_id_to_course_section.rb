class AddEventIdToCourseSection < ActiveRecord::Migration[5.2]
  tag :predeploy

  def change
    add_column :course_sections, :event_id, :integer
  end
end

