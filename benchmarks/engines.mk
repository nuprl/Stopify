include transform.mk

# Add new JavaScript engines HERE.
# Add the absolute path to the JS-Engine here:
ENGINEPATH := $(shell which node)

# Add the name of the JS-engine here (shoud not contain ':'):
# Note that the index must coorespond to the engine path.
ENGINENAME := node

# Join the data about the engines.
ENGINEDATA := $(join $(addsuffix :, $(ENGINEPATH)), $(ENGINENAME))

# GETTERS
GET_EPATH = $(word 1,$(subst :, ,$1))
GET_ENAME = $(word 2,$(subst :, ,$1))

# Name of the times.csv to be generated.
TIMES =  \
	$(foreach tr, $(TRANSFORMS), \
		$(foreach edata, $(ENGINEDATA), \
			$(call GET_ENAME,$(edata))-$(tr)-times.csv))
