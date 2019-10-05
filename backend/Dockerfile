ARG NODE_VERSION=11.14.0

#FROM node:${NODE_VERSION}-stretch AS oou-backend

#COPY --from=oou-base /oou /oou

FROM oou-base AS oou-backend

WORKDIR /oou/backend

RUN rm -rf /oou/frontend

CMD ["sh", "-c", "sleep 2 && npm run migrate-up && node build/index.js"]
#CMD sleep 3600
