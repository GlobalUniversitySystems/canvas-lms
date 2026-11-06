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

# Tracks the lifecycle (creation + soft-deletion) of the "Points MBM"
# opportunity chain: each row links a parent assignment (slot N) to the
# child assignment (slot N+1, i.e. Second Opportunity or Resit) created
# from it. Deliberately separate from AssignmentSecondOpportunity, which
# remains strictly pairwise and Points (2026)-only. A fresh row is always
# created if a child opportunity assignment is re-created after a previous
# one was deleted (i.e. rows are never reused/un-deleted).
class AssignmentMbmOpportunity < ActiveRecord::Base
  belongs_to :parent_assignment, class_name: "Assignment"
  belongs_to :child_assignment, class_name: "Assignment"
  belongs_to :assignment_group
  belongs_to :root_account, class_name: "Account"

  validates :parent_assignment_id, :child_assignment_id, :assignment_group_id, :root_account_id, :created_by_id, presence: true
  validates :opportunity_number, inclusion: { in: [Assignment::MBM_SECOND_OPPORTUNITY, Assignment::MBM_THIRD_OPPORTUNITY] }
  validates :child_assignment_id, uniqueness: true

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
