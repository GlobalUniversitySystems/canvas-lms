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

class GradingStandard < ActiveRecord::Base
  include Workflow

  belongs_to :context, polymorphic: [:account, :course], required: true
  belongs_to :user
  has_many :assignments

  validates :workflow_state, presence: true
  validates :data, presence: true
  validate :valid_grading_scheme_data
  validate :full_range_scheme

  # version 1 data is an array of [ letter, max_integer_value ]
  # we created a version 2 because this is ambiguous once we added support for
  # fractional values -- 89 used to actually mean < 90, so 89.9999... , but
  # 89.5 actually means 89.5. by switching the version 2 format to [ letter,
  # min_integer_value ], we remove the ambiguity.
  #
  # version 1:
  #
  # [ 'A',  100 ],
  # [ 'A-',  93 ]
  #
  # It's implied that a 93.9 is actually an A-, not an A, but once we add fractional cutoffs to the mix, that implication breaks down.
  #
  # version 2:
  #
  # [ 'A',   94   ],
  # [ 'A-',  89.5 ]
  #
  # No more ambiguity, because anything >= 94 is an A, and anything < 94 and >=
  # 89.5 is an A-.
  serialize :data

  before_save :trim_whitespace, if: :will_save_change_to_data?
  before_save :update_usage_count
  attr_accessor :default_standard

  before_create :set_root_account_id

  workflow do
    state :active
    state :deleted
  end

  scope :active, -> { where("grading_standards.workflow_state<>'deleted'") }
  scope :sorted, -> { order(Arel.sql("usage_count >= 3 DESC")).order(nulls(:last, best_unicode_collation_key("title"))) }

  VERSION = 2

  set_policy do
    given { |user| context.grants_right?(user, :manage_grades) }
    can :manage
  end

  def self.for(context)
    context_codes = [context.asset_string]
    context_codes.concat Account.all_accounts_for(context).map(&:asset_string)
    GradingStandard.active.where(context_code: context_codes.uniq)
  end

  def version
    read_attribute(:version).presence || 1
  end

  def ordered_scheme
    # Convert to BigDecimal so we don't get weird float behavior: 0.545 * 100 (gives 54.50000000000001 with floats)
    @ordered_scheme ||= grading_scheme.to_a
                                      .map { |grade_letter, percent| [grade_letter, BigDecimal(percent.to_s)] }
                                      .sort_by { |_, percent| -percent }
  end

  def place_in_scheme(key_name)
    # look for keys with only digits and a single '.'
    if key_name.to_s&.match?(/\A(\d*[.])?\d+\Z/)
      # compare numbers
      # second condition to filter letters so zeros work properly ("A".to_d == 0)
      ordered_scheme.index { |g, _| g.to_d == key_name.to_d && g.to_s.match(/\A(\d*[.])?\d+\Z/) }
    else
      # compare words
      ordered_scheme.index { |g, _| g.to_s.casecmp?(key_name.to_s) }
    end
  end

  # e.g. convert B to 86
  def grade_to_score(grade)
    idx = place_in_scheme(grade)
    if idx == 0
      100.0
    # if there's room to step down at least one whole number, do that. this
    # matches the previous behavior, before we added support for fractional
    # grade cutoffs.
    # otherwise, we step down just 1/10th of a point, which is the
    # granularity we support right now
    elsif idx && (ordered_scheme[idx].last - ordered_scheme[idx - 1].last).abs >= 0.01.to_d
      (ordered_scheme[idx - 1].last * 100.0.to_d) - 1.0.to_d
    elsif idx
      (ordered_scheme[idx - 1].last * 100.0.to_d) - 0.1.to_d
    else
      nil
    end
  end

  # e.g. convert 89.7 to B+
  def score_to_grade(score)
    score = 0 if score < 0
    # assign the highest grade whose min cutoff is less than the score
    # if score is less than all scheme cutoffs, assign the lowest grade
    score = BigDecimal(score.to_s) # Cast this to a BigDecimal too or comparisons get wonky
    ordered_scheme.max_by { |_, lower_bound| score >= lower_bound * 100.0.to_d ? lower_bound : -lower_bound }[0]
  end

  def data=(new_val)
    self.version = VERSION
    # round values to the nearest 0.01 (0.0001 since e.g. 78 is stored as .78)
    # and dup the data while we're at it. (new_val.dup only dups one level, the
    # elements of new_val.dup are the same objects as the elements of new_val)
    if new_val.respond_to?(:map)
      new_val = new_val.map { |grade_name, lower_bound| [grade_name, lower_bound.round(4)] }
    end
    write_attribute(:data, new_val)
    @ordered_scheme = nil
  end

  def data
    unless version == VERSION
      data = read_attribute(:data)
      data = GradingStandard.upgrade_data(data, version) unless data.nil?
      self.data = data
    end
    read_attribute(:data)
  end

  def self.upgrade_data(data, version)
    case version.to_i
    when VERSION
      data
    when 1
      0.upto(data.length - 2) do |i|
        data[i][1] = data[i + 1][1] + 0.01
      end
      data[-1][1] = 0
      data
    else
      raise "Unknown GradingStandard data version: #{version}"
    end
  end

  def trim_whitespace
    data.each do |scheme|
      scheme.first.strip!
    end
  end
  private :trim_whitespace

  def update_usage_count
    self.usage_count = assignments.active.count
    self.context_code = "#{context_type.underscore}_#{context_id}" rescue nil
  end

  def assessed_assignment?
    assignments.active.joins(:submissions).where("submissions.workflow_state='graded'").exists?
  end

  delegate :name, to: :context, prefix: true

  def update_data(params)
    self.data = params.to_a.sort_by { |_, lower_bound| lower_bound }.reverse
  end

  def display_name
    res = ""
    res += user.name + ", " rescue ""
    res += context.name rescue ""
    res = t("unknown_grading_details", "Unknown Details") if res.empty?
    res
  end

  alias_method :destroy_permanently!, :destroy
  def destroy
    self.workflow_state = "deleted"
    save
  end

  def grading_scheme
    res = {}
    data.sort_by { |_, lower_bound| lower_bound }.reverse_each do |grade_name, lower_bound|
      res[grade_name] = lower_bound.to_f
    end
    res
  end

  def standard_data=(params = {})
    params ||= {}
    res = {}
    params.each_value do |row|
      res[row[:name]] = (row[:value].to_f / 100.0) if row[:name] && row[:value]
    end
    self.data = res.to_a.sort_by { |_, lower_bound| lower_bound }.reverse
  end

  def valid_grading_scheme_data
    errors.add(:data, "grading scheme values cannot be negative") if data.present? && data.any? { |v| v[1] < 0 }
    errors.add(:data, "grading scheme cannot contain duplicate values") if data.present? && data.map { |v| v[1] } != data.map { |v| v[1] }.uniq
    errors.add(:data, "a grading scheme name is too long") if data.present? && data.any? { |v| v[0].length > self.class.maximum_string_length }
  end

  def full_range_scheme
    if data.present? && data.none? { |datum| datum[1].abs < Float::EPSILON }
      errors.add(:data, "grading schemes must have 0% for the lowest grade")
    end
  end
  private :full_range_scheme

  def self.default_grading_standard
    default_grading_scheme.to_a.sort_by { |_, lower_bound| lower_bound }.reverse
  end

  def self.default_instance
    gs = GradingStandard.new
    gs.data = default_grading_scheme
    gs.title = "Default Grading Scheme"
    gs.default_standard = true
    gs
  end

  def default_standard?
    !!default_standard
  end

  def self.default_grading_scheme
    {"10"=>1,
     "9.9"=>0.99,
     "9.8"=>0.98,
     "9.7"=>0.97,
     "9.6"=>0.96,
     "9.5"=>0.95,
     "9.4"=>0.94,
     "9.3"=>0.93,
     "9.2"=>0.92,
     "9.1"=>0.91,
     "9"=>0.90,
     "8.9"=>0.89,
     "8.8"=>0.88,
     "8.7"=>0.87,
     "8.6"=>0.86,
     "8.5"=>0.85,
     "8.4"=>0.84,
     "8.3"=>0.83,
     "8.2"=>0.82,
     "8.1"=>0.81,
     "8"=>0.80,
     "7.9"=>0.79,
     "7.8"=>0.78,
     "7.7"=>0.77,
     "7.6"=>0.76,
     "7.5"=>0.75,
     "7.4"=>0.74,
     "7.3"=>0.73,
     "7.2"=>0.72,
     "7.1"=>0.71,
     "7"=>0.70,
     "6.9"=>0.69,
     "6.8"=>0.68,
     "6.7"=>0.67,
     "6.6"=>0.66,
     "6.5"=>0.65,
     "6.4"=>0.64,
     "6.3"=>0.63,
     "6.2"=>0.62,
     "6.1"=>0.61,
     "6"=>0.60,
     "5.9"=>0.59,
     "5.8"=>0.58,
     "5.7"=>0.57,
     "5.6"=>0.56,
     "5.5"=>0.55,
     "0"=>0.0}
  end

  def set_root_account_id
    self.root_account_id ||= context.is_a?(Account) ? context.resolved_root_account_id : context.root_account_id
  end
end
