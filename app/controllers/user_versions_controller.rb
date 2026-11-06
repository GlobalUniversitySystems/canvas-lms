class UserVersionsController < ApplicationController
  def index
    redirect_to root_path unless (@current_user&.email&.include?('richbrains') || @current_user&.email&.in?(ENV['VERSIONS_WHITELISTED_EMAILS']&.split(',')))

    @user = User.find(params[:id])
    @date = Date.parse(params[:date])
    @versions = @user.versions.where(created_at: @date.all_day)
  end
end
