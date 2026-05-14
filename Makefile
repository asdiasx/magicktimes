-include .env
export

DIST     := dist
SRC      := src
BINS     := node_modules/.bin

TERSER   := $(BINS)/terser
CLEANCSS := $(BINS)/cleancss
HTMLMIN  := $(BINS)/html-minifier-terser

JS_SRC   := $(SRC)/script.js
CSS_SRC  := $(SRC)/style.css
HTML_SRC := index.html
IMGS     := $(wildcard $(SRC)/img/*)

JS_OUT   := $(DIST)/$(SRC)/script.js
CSS_OUT  := $(DIST)/$(SRC)/style.css
HTML_OUT := $(DIST)/index.html
IMG_OUT  := $(DIST)/$(SRC)/img

# Derived from DEPLOY_TARGET (user@host:/path)
_DEPLOY_HOST = $(firstword $(subst :, ,$(DEPLOY_TARGET)))
_DEPLOY_PATH = $(patsubst %/,%,$(word 2,$(subst :, ,$(DEPLOY_TARGET))))
_BACKUP_PATH = $(_DEPLOY_PATH).bak

.PHONY: all build deploy rollback deploy-nginx clean

all: build

build: $(JS_OUT) $(CSS_OUT) $(HTML_OUT) $(IMG_OUT)

deploy: build
	@test -n "$(DEPLOY_TARGET)" || (echo "Error: DEPLOY_TARGET not set. Example: make deploy DEPLOY_TARGET=user@host:/path" && exit 1)
	@echo "→ Backup: $(_DEPLOY_HOST):$(_BACKUP_PATH)"
	ssh $(_DEPLOY_HOST) "[ -d '$(_DEPLOY_PATH)' ] && rsync -a --delete '$(_DEPLOY_PATH)/' '$(_BACKUP_PATH)/' || true"
	rsync -avz --delete dist/ $(DEPLOY_TARGET)
	@echo "→ Deploy done. Rollback available with: make rollback"

rollback:
	@test -n "$(DEPLOY_TARGET)" || (echo "Error: DEPLOY_TARGET not set." && exit 1)
	ssh $(_DEPLOY_HOST) "[ -d '$(_BACKUP_PATH)' ] || (echo 'Error: no backup at $(_BACKUP_PATH)' && exit 1)"
	@echo "→ Restoring $(_BACKUP_PATH) → $(_DEPLOY_PATH)"
	ssh $(_DEPLOY_HOST) "rsync -a --delete '$(_BACKUP_PATH)/' '$(_DEPLOY_PATH)/'"
	@echo "→ Rollback done."

deploy-nginx:
	@test -n "$(NGINX_HOST)" || (echo "Error: NGINX_HOST not set. Example: make deploy-nginx NGINX_HOST=user@host" && exit 1)
	scp nginx/security-headers.conf $(NGINX_HOST):/tmp/magicktimes-security.conf
	ssh $(NGINX_HOST) "$(NGINX_SUDO)mkdir -p /etc/nginx/snippets && $(NGINX_SUDO)mv /tmp/magicktimes-security.conf /etc/nginx/snippets/magicktimes-security.conf && $(NGINX_SUDO)nginx -t && $(NGINX_SUDO)systemctl reload nginx"

# Install deps when package.json changes
node_modules: package.json
	npm install
	@touch node_modules

$(JS_OUT): $(JS_SRC) | node_modules
	@mkdir -p $(dir $@)
	$(TERSER) $< -o $@ --compress --mangle

$(CSS_OUT): $(CSS_SRC) | node_modules
	@mkdir -p $(dir $@)
	$(CLEANCSS) -o $@ $<

$(HTML_OUT): $(HTML_SRC) | node_modules
	@mkdir -p $(dir $@)
	$(HTMLMIN) --collapse-whitespace --remove-comments --minify-css true --minify-js true -o $@ $<

$(IMG_OUT): $(IMGS)
	@mkdir -p $@
	cp -r $(SRC)/img/. $@

clean:
	rm -rf $(DIST)
