# GENERATED FILE, DO NOT MODIFY!
# To update this file please edit the relevant template and run the generation
# task `build/dockerfile_writer.rb --env development --compose-file docker-compose.yml,docker-compose.override.yml --in build/Dockerfile.template --out Dockerfile`

ARG RUBY=2.7

FROM instructure/ruby-passenger:$RUBY
LABEL maintainer="Instructure"

ARG POSTGRES_CLIENT=12
ENV APP_HOME /usr/src/app/
ENV RAILS_ENV development
ENV NGINX_MAX_UPLOAD_SIZE 10g
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8
ENV LC_CTYPE en_US.UTF-8
ENV LC_ALL en_US.UTF-8
ARG CANVAS_RAILS6_1=0
ENV CANVAS_RAILS6_1=${CANVAS_RAILS6_1}

ENV YARN_VERSION 1.19.1-1
ENV BUNDLER_VERSION 2.2.17
ENV GEM_HOME /home/docker/.gem/$RUBY
ENV PATH $GEM_HOME/bin:$PATH
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

RUN apt-get update -qq \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      gnupg \
      lsb-release \
 && mkdir -p /etc/apt/keyrings \
 \
 && gpg --keyserver keyserver.ubuntu.com --recv-keys 1655A0AB68576280 \
 && gpg --export 1655A0AB68576280 \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
 && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] \
    https://deb.nodesource.com/node_14.x $(lsb_release -cs) main" \
    > /etc/apt/sources.list.d/nodesource.list \
 \
 && curl -fsSL https://dl.yarnpkg.com/debian/pubkey.gpg \
    | gpg --dearmor -o /etc/apt/keyrings/yarn.gpg \
 && echo "deb [signed-by=/etc/apt/keyrings/yarn.gpg] \
    https://dl.yarnpkg.com/debian stable main" \
    > /etc/apt/sources.list.d/yarn.list \
 \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /etc/apt/keyrings/postgres.gpg \
 && echo "deb [signed-by=/etc/apt/keyrings/postgres.gpg] \
    http://apt-archive.postgresql.org/pub/repos/apt/ \
    $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list \
 \
  && printf 'path-exclude /usr/share/doc/*\npath-exclude /usr/share/man/*' \
    > /etc/dpkg/dpkg.cfg.d/01_nodoc \
 \
  && apt-get update -qq \
  && apt-get install -qqy --no-install-recommends --fix-missing \
       nodejs \
       yarn="$YARN_VERSION" \
       libxmlsec1-dev \
       python-lxml \
       python3-lxml \
       libicu-dev \
       parallel \
       postgresql-client-$POSTGRES_CLIENT \
       unzip \
       pbzip2 \
       fontforge \
       git \
       build-essential \
       python2 \
       python-is-python2 \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /home/docker/.gem/ruby/$RUBY_MAJOR.0

RUN if [ -e /var/lib/gems/$RUBY_MAJOR.0/gems/bundler-* ]; then BUNDLER_INSTALL="-i /var/lib/gems/$RUBY_MAJOR.0"; fi \
  && gem uninstall --all --ignore-dependencies --force $BUNDLER_INSTALL bundler \
  && gem install bundler --no-document -v $BUNDLER_VERSION \
  && find $GEM_HOME ! -user docker | xargs chown docker:docker
RUN npm install -g npm@9.8.1 && npm cache clean --force

USER docker

WORKDIR $APP_HOME

COPY Gemfile      ${APP_HOME}
COPY Gemfile.d    ${APP_HOME}Gemfile.d
COPY config       ${APP_HOME}config
COPY --chown=docker:docker gems         ${APP_HOME}gems
COPY --chown=docker:docker engines         ${APP_HOME}engines
COPY --chown=docker:docker packages     ${APP_HOME}packages
COPY script       ${APP_HOME}script
COPY package.json ${APP_HOME}
COPY yarn.lock    ${APP_HOME}
COPY babel.config.js ${APP_HOME}

RUN n=0; until [ $n -ge 3 ]; do bundle install && break; n=$((n+1)); sleep 5; done \
  && n=0; until [ $n -ge 3 ]; do yarn install --network-timeout 100000 --pure-lockfile && break; n=$((n+1)); sleep 5; done
USER root


COPY . $APP_HOME

RUN set -eux; \
  mkdir -p \
    .yardoc \
    app/stylesheets/brandable_css_brands \
    app/views/info \
    config/locales/generated \
    gems/canvas_i18nliner/node_modules \
    log \
    node_modules \
    packages/canvas-media/es \
    packages/canvas-media/lib \
    packages/canvas-media/node_modules \
    packages/canvas-planner/lib \
    packages/canvas-planner/node_modules \
    packages/canvas-rce/canvas \
    packages/canvas-rce/lib \
    packages/canvas-rce/node_modules \
    packages/jest-moxios-utils/node_modules \
    packages/js-utils/es \
    packages/js-utils/lib \
    packages/js-utils/node_modules \
    packages/k5uploader/es \
    packages/k5uploader/lib \
    packages/k5uploader/node_modules \
    packages/old-copy-of-react-14-that-is-just-here-so-if-analytics-is-checked-out-it-doesnt-change-yarn.lock/node_modules \
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
# update Gemfile.lock in cases where a lock file was pulled in during the `COPY . $APP_HOME` step
RUN bundle lock --update
# TODO: switch to canvas:compile_assets_dev once we stop using this Dockerfile in production/e2e
#RUN COMPILE_ASSETS_NPM_INSTALL=0 bundle exec rake canvas:compile_assets
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN COMPILE_ASSETS_API_DOCS=0 \
    COMPILE_ASSETS_BRAND_CONFIGS=0 \
    COMPILE_ASSETS_NPM_INSTALL=1 \
    COMPILE_ASSETS_STYLEGUIDE=0 \
    bundle exec rails canvas:compile_assets

RUN RAILS_ENV=production NODE_OPTIONS="--max-old-space-size=4096" bundle exec rake js:webpack_production

RUN chown docker:docker * -R
