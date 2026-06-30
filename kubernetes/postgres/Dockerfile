FROM postgres:15-alpine

ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=AmerDevOps2026
ENV POSTGRES_DB=amer_portal

# Copy initialization scripts (executed in alphabetical order)
COPY 01-init-db.sql /docker-entrypoint-initdb.d/
COPY 02-seed-admin.sql /docker-entrypoint-initdb.d/

EXPOSE 5432
