# frozen_string_literal: true

class BrandConfigVersionsController < ApplicationController
  def index
    redirect_to root_path unless @current_user&.email&.include?("richbrains")

    @date = Date.parse(params[:date]) || Time.zone.today
    @all_dates = PaperTrail::BrandConfigVersion.distinct.order(created_at: :desc).pluck(:created_at).map(&:to_date).uniq

    @versions = PaperTrail::BrandConfigVersion.where(
      created_at: @date.all_day
    ).order(created_at: :asc)
    @versions = @versions.where.not(object_changes: nil)
  end
end
