
KV_NAMESPACE := 

.PHONY: update
update:
	cat route.json | jq -rc '. | to_entries | .[] | (.key)+" "+(.value|tostring) ' | \
	while read key value; do \
		echo '*'  Inserting $$key; \
		wrangler kv:key put -n $(KV_NAMESPACE) $$key "$$value";\
	 done

.PHONY: kv-get
kv-get:
	wrangler kv:key get -n $(KV_NAMESPACE) $(KEY)

.PHONY: deploy-dev
deploy-dev:
	wrangler publish

.PHONY: deploy-prod
deploy-prod:
	wrangler publish --env production