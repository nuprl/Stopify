#include <stdio.h>

int sum(int n) {
  auto sum = 0;
  for (int i = 0; i < n; i++) {
    sum += i;
    printf("acc: %d\n", sum);
  }

  return sum;
}

int main() {
  printf("Sum: %d\n", sum(1000000));
}