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

class File
  def self.mime_type(file)
    # INSTRUCTURE: added condition, file.class can also be Tempfile
    if file.instance_of?(File) || file.instance_of?(Tempfile)
      ErrorReport.create(
        category: 'Debug',
        message: '1 in File.mime_type',
        backtrace: {file_path: file.path}
      )
      # INSTRUCTURE: changed to IO.popen to avoid shell injection attacks when paths include user defined content
      mime = IO.popen(["file", "--mime", "--brief", "--raw", "--", file.path], &:read).strip
      ErrorReport.create(
        category: 'Debug',
        message: '1.1 in File.mime_type',
        backtrace: {mime: mime}
      )
    elsif file.instance_of?(String)
      ErrorReport.create(
        category: 'Debug',
        message: '2 in File.mime_type',
        backtrace: {}
      )
      mime = extensions[File.extname(file)[1..]&.downcase]
    elsif file.respond_to?(:string)
      ErrorReport.create(
        category: 'Debug',
        message: '3 in File.mime_type',
        backtrace: {}
      )
      temp = File.open(Dir.tmpdir + "/upload_file." + Process.pid.to_s, "wb")
      temp << file.string
      temp.close
      # INSTRUCTURE: changed to IO.popen to be sane and consistent. This one shouldn't be able to contain a user
      # specified path, but that's no reason to not do things the right way.
      mime = IO.popen(["file", "--mime", "--brief", "--raw", "--", temp.path], &:read).strip
      mime = mime.gsub(/^.*: */, "")
      mime = mime.gsub(/;.*$/, "")
      mime = mime.gsub(/,.*$/, "")
      File.delete(temp.path)
    end
    ErrorReport.create(
      category: 'Debug',
      message: '4.0 in File.mime_type',
      backtrace: {mime: mime}
    )
    mime = mime&.split(";")&.first
    ErrorReport.create(
      category: 'Debug',
      message: '4 in File.mime_type',
      backtrace: {mime: mime, mime_types: mime_types}
    )

    mime = nil unless mime_types[mime]

    ErrorReport.create(
      category: 'Debug',
      message: '5 in File.mime_type',
      backtrace: {mime: mime}
    )

    mime || "unknown/unknown"
  end

  def self.mime_types
    @@mime_types ||=
      extensions.each_with_object({}) do |(extension, mimes), new_hash|
        mimes.split(";").each { |mime| new_hash[mime] = extension }
      end
  end

  class << self
    private

    def extensions
      @@extensions ||= ::MimetypeFu::EXTENSIONS
    end
  end
end
