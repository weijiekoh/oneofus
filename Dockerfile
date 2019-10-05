ARG NODE_VERSION=11.14.0

FROM node:${NODE_VERSION}-stretch AS oou-build
WORKDIR /oou

# install solc
RUN wget https://github.com/ethereum/solidity/releases/download/v0.5.11/solc-static-linux && \
    chmod a+x solc-static-linux && \
    mv solc-static-linux /usr/bin/solc


# set NODE_ENV from the build-arg
ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

COPY package.json lerna.json tsconfig.json /oou/

RUN npm install --quiet && \
    npm cache clean --force

COPY semaphore /oou/semaphore

COPY scripts/downloadSnarks.sh /oou/scripts/
RUN cd /oou/ && \
    ./scripts/downloadSnarks.sh

COPY scripts /oou/scripts

RUN mkdir /oou/contracts && \
    mkdir /oou/config && \
    mkdir /oou/utils && \
    mkdir /oou/backend && \
    mkdir /oou/frontend

COPY config/package*.json /oou/config/
COPY contracts/package*.json /oou/contracts/
COPY utils/package*.json /oou/utils/
COPY backend/package*.json /oou/backend/
COPY frontend/package*.json /oou/frontend/

RUN npx lerna bootstrap --no-progress

COPY contracts /oou/contracts
COPY config /oou/config
COPY utils /oou/utils
COPY backend /oou/backend
COPY frontend /oou/frontend

RUN rm -rf /oou/frontend/build /oou/frontend/dist
RUN npx lerna run build
RUN cd /oou/contracts && npm run compileABIs

###
ENV NODE_ENV_BAK=$NODE_ENV
ENV NODE_ENV=production

RUN echo "Building frontend with NODE_ENV=production" && \
    cd frontend && \
    npm run build

ENV NODE_ENV=$NODE_ENV_BAK
###

FROM node:${NODE_VERSION}-stretch AS oou-base

COPY --from=oou-build /oou/contracts /oou/contracts
COPY --from=oou-build /oou/config /oou/config
COPY --from=oou-build /oou/utils /oou/utils
COPY --from=oou-build /oou/backend /oou/backend
COPY --from=oou-build /oou/frontend /oou/frontend

COPY --from=oou-build /oou/package.json /oou/package.json
COPY --from=oou-build /oou/lerna.json /oou/lerna.json
COPY --from=oou-build /oou/tsconfig.json /oou/tsconfig.json

RUN rm -rf /oou/contracts/ts/ \
        /oou/config/ts/ \
        /oou/utils/ts/ \
        /oou/backend/ts/ \
        /oou/frontend/ts/

RUN cd /oou/contracts && npm uninstall --save-dev && \
    cd ../config && npm uninstall --save-dev && \
    cd ../utils && npm uninstall --save-dev && \
    cd ../backend && npm uninstall --save-dev && \
    cd ../frontend && npm uninstall --save-dev

