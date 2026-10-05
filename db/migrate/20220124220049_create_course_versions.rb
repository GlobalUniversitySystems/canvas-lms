class CreateCourseVersions < ActiveRecord::Migration[5.2]
  tag :predeploy

  TEXT_BYTES = 1_073_741_823

  def change
    create_table :course_versions do |t|
      t.string   :item_type, null: false
      t.integer  :item_id,   null: false
      t.string   :event,     null: false
      t.string   :whodunnit
      t.text     :object, limit: TEXT_BYTES
      t.text     :object_changes, limit: TEXT_BYTES
      t.datetime :created_at
    end

    add_index :course_versions, %i(item_type item_id)
  end
end
