#include <node_buffer.h>
#include <uv.h>

using node::AtExit;
using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::MaybeLocal;
using v8::Object;
using v8::Boolean;
using v8::String;
using v8::Exception;
using v8::Value;

void ping(uv_work_t*);
void empty(uv_work_t*, int);

static int ms = 0;
static uv_loop_t loop;
static uv_timer_t timer;
static uv_idle_t dummy;
static uv_work_t work;

static char* data;

void idle(uv_idle_t*) { }

void Set(uv_timer_t*) {
  *data = 1;
}

void Reset(const FunctionCallbackInfo<Value>& args) {
  *data = 0;
}

void Suspend(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  auto buf = node::Buffer::New(isolate, data, 1);
  args.GetReturnValue().Set(buf.ToLocalChecked());
}

void ping(uv_work_t* work) {
  uv_loop_init(&loop);

  uv_timer_init(&loop, &timer);
  uv_unref((uv_handle_t*) &timer);
  uv_timer_start(&timer, Set, ms, ms);

  uv_idle_init(&loop, &dummy);
  uv_idle_start(&dummy, idle);

  uv_run(&loop, UV_RUN_DEFAULT);
}

void empty(uv_work_t*, int status) {
}

void Init(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // Check the number of arguments passed.
  if (args.Length() != 1) {
    // Throw an Error that is passed back to JavaScript
    isolate-> ThrowException(Exception::TypeError(String::NewFromUtf8(isolate,
            "Wrong number of arguments")));
    return;
  }

  // Check the argument type.
  if (!args[0]->IsNumber()) {
    isolate->ThrowException(Exception::TypeError(String::NewFromUtf8(isolate,
            "Wrong argument type: expected `number`")));
    return;
  }

  ms = args[0]->NumberValue();

  uv_queue_work(uv_default_loop(), &work, ping, empty);

  data = (char*) malloc(1);
  *data = 0;
  auto buf = node::Buffer::New(isolate, data, 1);
  args.GetReturnValue().Set(buf.ToLocalChecked());
}

void Cancel(const FunctionCallbackInfo<Value>& args) {
  uv_unref((uv_handle_t*) &dummy);
}

static void atExit(void*) {
}

void require(Local<Object> exports) {
  NODE_SET_METHOD(exports, "suspend", Suspend);
  NODE_SET_METHOD(exports, "reset", Reset);
  NODE_SET_METHOD(exports, "init", Init);
  NODE_SET_METHOD(exports, "cancel", Cancel);
  AtExit(atExit);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, require)
