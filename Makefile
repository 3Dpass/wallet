TAG := $(shell git describe --abbrev=0 --tags)
TAG_NUM := $(shell echo $(TAG) | sed 's/v//')
NEXT_TAG := v$(shell echo $$(( $(TAG_NUM) + 1 )))

update:
	corepack prepare pnpm@latest --activate
	pnpm update --interactive --latest

deploy:
	@echo "Creating and pushing tag $(NEXT_TAG)"
	git tag -a $(NEXT_TAG) -m "Version $(NEXT_TAG)"
	git push origin $(NEXT_TAG)
	git push
