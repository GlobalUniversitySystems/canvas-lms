module PaperTrail
  class UserVersion < ::PaperTrail::Version
    self.table_name = :user_versions
  end
end
