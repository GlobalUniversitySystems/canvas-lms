require 'intercom-rails'

settings = ConfigFile.load('intercom')

IntercomRails.config do |config|
  config.app_id = settings[:app_id]

  config.api_secret = settings[:secret_key] if settings[:secret_key]

  config.enabled_environments = ['development', 'production']

  config.user.current = Proc.new { @current_user }

  config.user.model = Proc.new { User }

  config.include_for_logged_out_users = true
end
