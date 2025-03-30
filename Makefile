TAG := $(shell git describe --abbrev=0 --tags)
TAG_NUM := $(shell echo $(TAG) | sed 's/v//')
NEXT_TAG := v$(shell echo $$(( $(TAG_NUM) + 1 )))

lint:
	biome check --write .

update:
	pnpm self-update
	pnpm update --interactive --latest

deploy:
	@if [ -n "$(git status --porcelain)" ]; then \
		echo "Error: Git working directory is not clean. Please commit or stash changes first."; \
		exit 1; \
	fi
	@git fetch origin
	@if [ "$(git rev-parse HEAD)" != "$(git rev-parse @{u})" ]; then \
		echo "Error: Local branch is not up-to-date with remote. Please pull the latest changes."; \
		exit 1; \
	fi
	@echo "Creating and pushing tag $(NEXT_TAG)"
	git tag -a $(NEXT_TAG) -m "Version $(NEXT_TAG)"
	git push origin $(NEXT_TAG)
	git push
