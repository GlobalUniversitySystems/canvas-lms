# GENERATED FILE, DO NOT MODIFY!
# To update this file please edit the relevant template and run the generation
# task `build/dockerfile_writer.rb --env development --compose-file docker-compose.yml,docker-compose.override.yml --in build/Dockerfile.template --out Dockerfile`

ARG RUBY=3.3

FROM instructure/ruby-passenger:$RUBY
LABEL maintainer="Instructure"

ARG RUBY
ARG POSTGRES_CLIENT=14
ENV APP_HOME /usr/src/app/
ENV RAILS_ENV development
ENV NGINX_MAX_UPLOAD_SIZE 10g
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8
ENV LC_CTYPE en_US.UTF-8
ENV LC_ALL en_US.UTF-8
ARG CANVAS_RAILS=7.1
ENV CANVAS_RAILS=${CANVAS_RAILS}

ENV NODE_MAJOR 18
ENV YARN_VERSION 1.19.1-1
ENV GEM_HOME /home/docker/.gem/$RUBY
ENV PATH ${APP_HOME}bin:$GEM_HOME/bin:$PATH
ENV BUNDLE_APP_CONFIG /home/docker/.bundle

WORKDIR $APP_HOME

USER root

ARG USER_ID
# This step allows docker to write files to a host-mounted volume with the correct user permissions.
# Without it, some linux distributions are unable to write at all to the host mounted volume.
RUN if [ -n "$USER_ID" ]; then usermod -u "${USER_ID}" docker \
        && chown --from=9999 docker /usr/src/nginx /usr/src/app -R; fi

# --- Fix Passenger GPG issue from base image ---
RUN set -eux; \
  # temporarily disable Passenger repo so apt can run
  find /etc/apt -type f \( -name "*.list" -o -name "*.sources" \) -print0 \
    | xargs -0 -r grep -l "oss-binaries\.phusionpassenger\.com" \
    | xargs -r sed -i 's/^/# disabled-by-dockerfile /'; \
  \
  apt-get update -qq; \
  apt-get install -y --no-install-recommends gnupg dirmngr ca-certificates; \
  \
  apt-key adv --keyserver keyserver.ubuntu.com --recv-keys D870AB033FB45BD1; \
  \
  # re-enable Passenger repo
  find /etc/apt -type f \( -name "*.list" -o -name "*.sources" \) -print0 \
    | xargs -0 -r grep -l "disabled-by-dockerfile .*oss-binaries\.phusionpassenger\.com" \
    | xargs -r sed -i 's/^# disabled-by-dockerfile //'; \
  \
  rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/apt/keyrings \
  && curl -fsSL --retry 5 --retry-delay 5 https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
       | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
       | tee /etc/apt/sources.list.d/nodesource.list \
  && curl -fsSL --retry 5 --retry-delay 5 https://dl.yarnpkg.com/debian/pubkey.gpg \
       | gpg --dearmor -o /etc/apt/keyrings/yarn.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/yarn.gpg] https://dl.yarnpkg.com/debian/ stable main" \
       > /etc/apt/sources.list.d/yarn.list \
  && printf 'path-exclude /usr/share/doc/*\npath-exclude /usr/share/man/*' > /etc/dpkg/dpkg.cfg.d/01_nodoc \
  && curl -fsSL --retry 5 --retry-delay 5 https://www.postgresql.org/media/keys/ACCC4CF8.asc \
       | gpg --dearmor -o /etc/apt/keyrings/pgdg.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/pgdg.gpg] http://apt-archive.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update -qq \
  && apt-get install -qqy --no-install-recommends \
       nodejs \
       yarn="$YARN_VERSION" \
       libxmlsec1-dev \
       python3-lxml \
       python-is-python3 \
       libicu-dev \
       libidn11-dev \
       parallel \
       postgresql-client-$POSTGRES_CLIENT \
       unzip \
       pbzip2 \
       fontforge \
       git \
       build-essential \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /home/docker/.gem/ruby/$RUBY_MAJOR.0

RUN gem install bundler --no-document -v 2.5.10 \
  && find $GEM_HOME ! -user docker | xargs chown docker:docker
RUN npm install -g npm@9.8.1
RUN rm -rf /root/.npm/_cacache && npm cache clean --force

USER docker

WORKDIR $APP_HOME

COPY Gemfile      ${APP_HOME}
COPY Gemfile.d    ${APP_HOME}Gemfile.d
COPY config       ${APP_HOME}config
COPY --chown=docker:docker gems         ${APP_HOME}gems
COPY --chown=docker:docker vendor/gems  ${APP_HOME}vendor/gems
COPY --chown=docker:docker packages     ${APP_HOME}packages
COPY script       ${APP_HOME}script
COPY package.json ${APP_HOME}
COPY yarn.lock    ${APP_HOME}

RUN n=0; until [ $n -ge 3 ]; do env -u RUBY bundle install && break; n=$((n+1)); sleep 5; done \
  && n=0; until [ $n -ge 3 ]; do yarn install --network-timeout 100000 --pure-lockfile && break; n=$((n+1)); sleep 5; done
USER root

COPY . $APP_HOME

RUN set -eux; \
  mkdir -p \
    .yardoc \
    app/stylesheets/brandable_css_brands \
    app/views/info \
    config/locales/generated \
    log \
    node_modules \
    packages/js-utils/es \
    packages/js-utils/lib \
    packages/js-utils/node_modules \
    pacts \
    public/dist \
    public/doc/api \
    public/javascripts/translations \
    reports \
    tmp \
    /home/docker/.bundle/ \
    /home/docker/.cache/yarn \
    /home/docker/.gem/ \
    && find ${APP_HOME} /home/docker ! -user docker -print0 | xargs -0 chown -h docker:docker

USER docker
# Add the linux platform to the lockfile (in case it was generated on macOS/Windows)
# without updating any gem versions, then install any missing gems.
RUN bundle lock --add-platform x86_64-linux || true \
  && n=0; until [ $n -ge 3 ]; do env -u RUBY bundle install && break; n=$((n+1)); sleep 5; done
# TODO: switch to canvas:compile_assets_dev once we stop using this Dockerfile in production/e2e
#RUN COMPILE_ASSETS_NPM_INSTALL=0 bundle exec rake canvas:compile_assets
RUN COMPILE_ASSETS_API_DOCS=0 \
    COMPILE_ASSETS_BRAND_CONFIGS=0 \
    COMPILE_ASSETS_NPM_INSTALL=1 \
    COMPILE_ASSETS_STYLEGUIDE=0 \
    bundle exec rails canvas:compile_assets

RUN RAILS_ENV=production bundle exec rake js:webpack_production

RUN chown docker:docker * -R
