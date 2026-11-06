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

# Tracks the lifecycle (creation + soft-deletion) of "Second Opportunity"
# assignments created for mandatory AssignmentGroups under the
# "Points (2026)" grading scheme. One row is created every time a second
# opportunity assignment is created; a fresh row is always created if a
# second opportunity assignment is re-created after a previous one was
# deleted (i.e. rows are never reused/un-deleted).
class AssignmentSecondOpportunity < ActiveRecord::Base
  belongs_to :first_assignment, class_name: "Assignment"
  belongs_to :second_assignment, class_name: "Assignment"
  belongs_to :assignment_group
  belongs_to :root_account, class_name: "Account"

  validates :first_assignment_id, :second_assignment_id, :assignment_group_id, :root_account_id, :created_by_id, presence: true
  validates :second_assignment_id, uniqueness: true

  scope :active, -> { where(deleted_at: nil) }
  scope :deleted, -> { where.not(deleted_at: nil) }

  before_create :set_root_account_id

  def deleted?
    deleted_at.present?
  end

  # Marks this tracking record as deleted. Safe to call multiple times;
  # only the first call records the deletion metadata.
  def mark_deleted!(deleted_by_id: nil)
    return if deleted?

    update!(deleted_at: Time.zone.now, deleted_by_id: deleted_by_id)
  end

  private

  def set_root_account_id
    self.root_account_id ||= assignment_group&.context&.root_account_id
  end
end

