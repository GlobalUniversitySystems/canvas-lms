# frozen_string_literal: true

#
# Copyright (C) 2026 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.
#

class CreateAssignmentMbmOpportunities < ActiveRecord::Migration[6.1]
  tag :predeploy

  def change
    create_table :assignment_mbm_opportunities do |t|
      t.references :parent_assignment, null: false, foreign_key: { to_table: :assignments }, index: true
      t.references :child_assignment, null: false, foreign_key: { to_table: :assignments }, index: { unique: true }
      t.references :assignment_group, null: false, foreign_key: true, index: true
      t.references :root_account, null: false, foreign_key: { to_table: :accounts }, index: true
      t.integer :opportunity_number, null: false
      t.bigint :created_by_id, null: false
      t.bigint :deleted_by_id
      t.datetime :deleted_at
      t.timestamps
    end

    add_index :assignment_mbm_opportunities, :created_by_id
    add_index :assignment_mbm_opportunities, :deleted_by_id
    add_index :assignment_mbm_opportunities, :deleted_at
  end
end
