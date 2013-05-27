# Makefile for emonkak.github.io

RULES=all clean
MAKEFILES=$(wildcard */Makefile)

define GenerateRule
$(2):
	cd $(dir $(1)) && make --no-print-directory $(2)
.PHONY: $(2)

endef

$(eval \
  $(foreach makefile, $(MAKEFILES), \
    $(foreach rule, $(RULES), \
      $(call GenerateRule,$(makefile),$(rule)))))
