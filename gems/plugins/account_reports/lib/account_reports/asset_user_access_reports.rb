# frozen_string_literal: true

#
# Copyright (C) 2011 - present Instructure, Inc.
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

module AccountReports
  class AssetUserAccessReports
    include ReportHelper

    def initialize(account_report)
      @account_report = account_report
      @account_report.parameters ||= {}
    end

    def user_asset_access_csv
      user_id = @account_report.parameters["user_id"]
      unless user_id.present?
        @account_report.fail_with_error_message("User ID is required")
        return
      end

      user = User.find_by(id: user_id)
      unless user
        @account_report.fail_with_error_message("User not found with ID: #{user_id}")
        return
      end

      headers = []
      headers << "user_id"
      headers << "user_name"
      headers << "asset_category"
      headers << "context_id"
      headers << "context_type"
      headers << "context_name"
      headers << "display_name"
      headers << "action_level"
      headers << "last_access"
      headers << "initial_access"

      write_report headers do |csv|
        # Get all asset user accesses for the user
        accesses = AssetUserAccess.where(user_id: user_id)

        # Order by last access (most recent first)
        accesses = accesses.order("last_access DESC")

        accesses.find_each do |access|
          row = []
          row << access.user_id
          row << user.name
          row << access.asset_category
          row << access.context_id
          row << access.context_type

          # Get context name
          context_name = get_context_name(access.context_type, access.context_id)
          row << context_name

          row << access.display_name
          row << access.action_level
          row << default_timezone_format(access.last_access) if access.last_access
          row << default_timezone_format(access.created_at)

          csv << row
        end
      end
    end

    private

    def get_context_name(context_type, context_id)
      case context_type
      when "Course"
        Course.find_by(id: context_id)&.name || "Unknown Course"
      when "Account"
        Account.find_by(id: context_id)&.name || "Unknown Account"
      when "Group"
        Group.find_by(id: context_id)&.name || "Unknown Group"
      when "User"
        User.find_by(id: context_id)&.name || "Unknown User"
      else
        "#{context_type} #{context_id}"
      end
    rescue
      "#{context_type} #{context_id}"
    end
  end
end
