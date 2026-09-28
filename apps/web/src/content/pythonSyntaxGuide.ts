export interface SyntaxGuideSection {
  id: string;
  title: string;
  markdown: string;
}

// A static, offline Python syntax cheatsheet bundled with the app. Unlike the
// per-exercise "concepts" primer (AI-generated, specific to one exercise),
// this is fixed reference material covering the language generally - always
// available instantly, with no AI round trip.
export const PYTHON_SYNTAX_GUIDE: SyntaxGuideSection[] = [
  {
    id: 'variables',
    title: 'Variables & types',
    markdown: `Python is dynamically typed - a variable's type is inferred from its value.

\`\`\`python
name = "Ada"        # str
age = 36             # int
height = 1.7          # float
is_admin = True         # bool
nothing = None            # NoneType
\`\`\`

Check a value's type with \`type(x)\`, and check membership in a type with \`isinstance(x, int)\`.`,
  },
  {
    id: 'operators',
    title: 'Operators',
    markdown: `\`\`\`python
7 // 2      # 3   - floor (integer) division
7 % 2       # 1   - remainder
2 ** 10     # 1024 - exponent
a == b      # equality
a is b      # identity (same object), not equality
not a       # boolean negation
a and b     # both must be truthy
a or b      # either truthy
\`\`\`

Chained comparisons work directly: \`0 <= x < 10\`.`,
  },
  {
    id: 'strings',
    title: 'Strings & f-strings',
    markdown: `\`\`\`python
name = "Ada"
greeting = f"Hello, {name}! You are {2024 - 1815} years old."

"hello".upper()       # "HELLO"
"  hi  ".strip()        # "hi"
"a,b,c".split(",")       # ["a", "b", "c"]
",".join(["a", "b", "c"])  # "a,b,c"
"abc"[0]                    # "a"  - indexing
"abcdef"[1:4]                # "bcd" - slicing [start:end]
"abcdef"[::-1]                 # "fedcba" - reversed
\`\`\`

Strings are immutable - every string method returns a *new* string.`,
  },
  {
    id: 'collections',
    title: 'Lists, tuples, dicts, sets',
    markdown: `\`\`\`python
nums = [1, 2, 3]          # list: ordered, mutable
nums.append(4)              # [1, 2, 3, 4]
nums[0]                       # 1
nums[-1]                       # 4 (last item)

point = (3, 4)                    # tuple: ordered, immutable
x, y = point                        # unpacking

person = {"name": "Ada", "age": 36}    # dict: key -> value
person["name"]                           # "Ada"
person.get("email", "unknown")             # default if key missing
for key, value in person.items():            # iterate pairs
    print(key, value)

unique = {1, 2, 2, 3}                          # set: {1, 2, 3}, no duplicates
\`\`\``,
  },
  {
    id: 'control-flow',
    title: 'Conditionals & loops',
    markdown: `\`\`\`python
if age >= 18:
    status = "adult"
elif age >= 13:
    status = "teen"
else:
    status = "child"

for item in [1, 2, 3]:
    print(item)

for index, item in enumerate(["a", "b"]):    # index + item
    print(index, item)

for a, b in zip([1, 2], [3, 4]):               # pair up two sequences
    print(a, b)

count = 0
while count < 3:
    count += 1

for n in range(5):        # 0, 1, 2, 3, 4
    pass
for n in range(2, 10, 2):   # 2, 4, 6, 8
    pass
\`\`\`

\`break\` exits a loop early; \`continue\` skips to the next iteration.`,
  },
  {
    id: 'functions',
    title: 'Functions',
    markdown: `\`\`\`python
def greet(name, greeting="Hello"):     # default argument
    return f"{greeting}, {name}!"

greet("Ada")                # "Hello, Ada!"
greet("Ada", greeting="Hi")   # keyword argument

def total(*args):               # collects extra positional args into a tuple
    return sum(args)
total(1, 2, 3)                    # 6

def configure(**kwargs):              # collects extra keyword args into a dict
    return kwargs
configure(debug=True, retries=3)        # {"debug": True, "retries": 3}

square = lambda x: x * x                  # small anonymous function
\`\`\`

A function with no explicit \`return\` returns \`None\`.`,
  },
  {
    id: 'comprehensions',
    title: 'Comprehensions',
    markdown: `A compact way to build a list, dict, or set from an iterable.

\`\`\`python
squares = [x * x for x in range(5)]                 # [0, 1, 4, 9, 16]
evens = [x for x in range(10) if x % 2 == 0]          # filter with an "if"
pairs = {x: x * x for x in range(3)}                    # dict comprehension
unique_lengths = {len(w) for w in ["a", "bb", "cc"]}      # set comprehension
\`\`\`

Equivalent to a \`for\` loop with \`.append()\`, just more idiomatic for simple transforms.`,
  },
  {
    id: 'exceptions',
    title: 'Exceptions',
    markdown: `\`\`\`python
try:
    result = 10 / divisor
except ZeroDivisionError:
    result = None
except (TypeError, ValueError) as e:      # multiple types, capture the error
    print(f"Bad input: {e}")
else:
    print("No exception was raised")
finally:
    print("Always runs, error or not")

if divisor == 0:
    raise ValueError("divisor must not be zero")
\`\`\`

Catch the most specific exception type you can - avoid a bare \`except:\`.`,
  },
  {
    id: 'classes',
    title: 'Classes (basics)',
    markdown: `\`\`\`python
class Point:
    def __init__(self, x, y):    # constructor
        self.x = x
        self.y = y

    def distance_from_origin(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5

p = Point(3, 4)
p.distance_from_origin()    # 5.0
\`\`\`

\`self\` refers to the instance and is always the first parameter of an instance method.`,
  },
  {
    id: 'builtins',
    title: 'Common built-ins',
    markdown: `\`\`\`python
len([1, 2, 3])                      # 3
sorted([3, 1, 2])                     # [1, 2, 3]
sorted(words, key=len)                  # sort by a custom key
sum([1, 2, 3])                            # 6
max([1, 2, 3]); min([1, 2, 3])              # 3, 1
list(map(str, [1, 2, 3]))                     # ["1", "2", "3"]
list(filter(lambda x: x > 1, [1, 2, 3]))        # [2, 3]
list(reversed([1, 2, 3]))                         # [3, 2, 1]
any([False, True]); all([True, True])               # True, True
\`\`\``,
  },
  {
    id: 'type-hints',
    title: 'Type hints (optional)',
    markdown: `Type hints document intent - Python does not enforce them at runtime.

\`\`\`python
def add(a: int, b: int) -> int:
    return a + b

def greet(name: str, greeting: str | None = None) -> str:
    return f"{greeting or 'Hello'}, {name}!"

numbers: list[int] = [1, 2, 3]
lookup: dict[str, int] = {"a": 1}
\`\`\``,
  },
];
