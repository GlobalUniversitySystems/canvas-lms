class UserVersionsController < ApplicationController
  def index
    redirect_to root_path unless (@current_user&.email&.include?('richbrains') || @current_user&.email&.in?(ENV['VERSIONS_WHITELISTED_EMAILS']&.split(',')))

    @user = User.find(params[:id])
    @date = Date.parse(params[:date])
    @versions = PaperTrail::UserVersion.where(item_type: "User", item_id: @user.id, created_at: @date.all_day).where.not(object_changes: nil)
  end
end
