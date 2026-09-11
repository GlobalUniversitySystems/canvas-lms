class AddCreationSourceToCalendarEvents < ActiveRecord::Migration[5.2]
  tag :predeploy

  def change
    add_column :calendar_events, :creation_source, :string
    add_index :calendar_events, :creation_source
  end
end