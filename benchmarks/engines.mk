include transform.mk

# Add new JavaScript engines HERE.
# For spaces, use '@'
# Add the absolute path to the JS-Engine here:
ENGINEPATH := $(shell which node)@--harmony_tailcalls "$(shell which node)"

# Add the name of the JS-engine here (shoud not contain ':' or '-'):
# Note that the index must coorespond to the engine path.
ENGINENAME := nodeHarmony node

# Join the data about the engines.
ENGINEDATA := $(join $(addsuffix :, $(ENGINEPATH)), $(ENGINENAME))

# GETTERS
GET_EPATH = $(subst @, ,$(word 1,$(subst :, ,$1)))
GET_ENAME = $(subst @, ,$(word 2,$(subst :, ,$1)))

RUNNABLE := base $(TRANSFORMS)

# Name of the times.csv to be generated.
TIMES =  \
	$(foreach tr, $(RUNNABLE), \
		$(foreach edata, $(ENGINEDATA), \
			$(call GET_ENAME,$(edata))-$(tr)-times.csv))
