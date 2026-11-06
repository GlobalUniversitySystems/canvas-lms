class PreventSuccessHeader
  def initialize(app)
    @app = app
    @create_success_paths = [%r{\A/api/.*/create_success[^/]*(/|)\z}]
    @create_success_content_types = [%r{\Amultipart/form-data}]
  end

  def call(env)
    env["CONTENT_TYPE"] = "text/html" if !@create_success_paths.detect { |r| env["PATH_INFO"] =~ r }.nil? && !@create_success_content_types.detect { |r| env["CONTENT_TYPE"] =~ r }.nil?

    @app.call(env)
  end
end
