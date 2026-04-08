#!/bin/bash
TOKEN="sbp_3ebe367cc322192ea80b5ae4d3a4995ce908f6fa"
BASE="https://api.supabase.com/v1/projects/jltkdbsbrnwrqxouhpgu/database/query"

run() {
  local id="$1" url="$2" label="$3"
  local result
  result=$(curl -s -X POST "$BASE" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"UPDATE lessons SET youtube_url = '$url' WHERE id = '$id';\"}")
  echo "$label: $result"
}

# ENGLISH: Punctuation
run "1cdb5f86-86da-4324-bc37-fae244b7f849" "https://youtu.be/_H8qaLY2kvM"     "Commas"
run "163e9860-223c-41f8-baf7-89d7a0b31527" "https://youtu.be/mRttqN3jILY"     "Semicolons"
run "ce950e3f-729f-4d4c-b9dd-2cbc2996e561" "https://youtu.be/4x2NPfQV5Uc"     "Apostrophes & Possession"
run "6ecf7f36-bd23-47b2-a100-5eedfa6799f5" "https://youtu.be/rLSY9ZlQxpA"     "Colons"
run "c11623d0-8691-4758-ad31-15d8e32afdab" "https://youtu.be/czF0BjqT-zg"     "Dashes"
run "0a8b9416-fee9-49a4-9065-cc35a2eaa00d" "https://youtu.be/TAw5rYb_DZM"     "Parentheses"
run "cc083a97-3726-43ce-b577-3d24815c802b" "https://youtu.be/YG7BJUyC_3U"     "Commas between Adjectives"
# ENGLISH: Other modules
run "cc631dab-0e9e-4447-b429-4a6fd53b5d3e" "https://youtu.be/1f1HU48fr1Q"     "Who vs. Whom"
run "3e16efba-199e-4617-a436-62d4f8448ad4" "https://youtu.be/8WaIbntoAJw"     "Transition Words"
run "55e0fe08-354c-4060-90c9-d8f102d91ef9" "https://youtu.be/J961JKMDJbQ"     "Misplaced & Dangling Modifiers"
run "919c8b95-5fb0-44b6-86d2-0796113a6bc8" "https://youtu.be/sLA4uQKVZDU"     "YYNN and Order Questions"
run "0c6b60f4-d984-425b-b986-d30e98574516" "https://youtu.be/vuM1hfO7zmo"     "No Redundancy"
run "cae330cd-a07f-470a-916a-4047c52498e0" "https://youtu.be/hlEv1XJuMxI"     "Specific Detail Questions"
# MATH: Integers
run "ff02c41f-0b42-4a8c-9d1e-d2d70ebc6528" "https://youtu.be/Yrq1wSoutEY"     "Integers: Addition & Subtraction"
run "482744ef-e25c-4dff-8297-c326f0b1f661" "https://youtu.be/CL0K6ZzStNc"     "Integers: Multiplication & Division"
# MATH: Fractions
run "97c5ae9d-2b12-4c26-8e6b-c7412f9f3b43" "https://youtu.be/rINPGm3bo10"     "Fractions Introduction"
run "e51ccaf6-4005-4014-8c5d-5ff9d8d2dda6" "https://youtu.be/8r5l1Y0aclM"     "Fraction Addition & Subtraction"
run "485239e5-4dc2-4640-8581-b5ca17248324" "https://youtu.be/9UQ4ypcboyA"     "Fraction Multiplication & Division"
# MATH: Order of Operations
run "a6daf6ba-f3e8-4231-9132-a4441e66fb84" "https://youtu.be/EXQ6nW1vEEI"     "PEMDAS"
# MATH: Properties of Exponents & Radicals
run "b06e016a-3d90-4b1b-892d-ddcbcaa64f78" "https://youtu.be/k5dPBZgEfsQ"     "Properties of Exponents"
run "73787b8e-8977-4036-8516-1a67d809276f" "https://youtu.be/D0vQZNCRhg0"     "Introduction to Radicals"
run "50058d96-c3f3-4654-9e97-cf531e7fb18b" "https://youtu.be/AB2v7zHCK8k"     "Adding and Subtracting Radicals"
run "866d5d13-9e92-422a-a539-27a7d071e5c2" "https://youtu.be/YqKCpKQ0bGQ"     "Multiplying and Dividing Radicals"
run "713c4bed-cf77-4236-88e8-a55039848d23" "https://youtu.be/7-SUqsZZ-yM"     "Rationalizing (Conjugates)"
# MATH: Complex Numbers
run "8f0e6e91-9d7a-46a2-be28-dcd87077bf25" "https://youtu.be/SOKlgWrcbG8"     "Imaginary Number (i)"
run "e474c9fc-ad70-4fe0-93e3-2dc4bc7372fd" "https://youtu.be/GbYzIdIO94U"     "Complex: Add, Sub, Multiply"
run "28697b29-a9a7-4b13-9437-4f7018109722" "https://youtu.be/SIYabPbmNOQ"     "Division & Conjugates"
run "b82b3731-fea1-4f96-b16f-9603a4b7aa54" "https://youtu.be/oUEkb30OSew"     "Complex #s SAT & ACT Questions"
# MATH: Linear Functions
run "4e407593-4ac0-423b-8619-dd0f0371f03b" "https://youtu.be/MdNCQBAcEU0"     "Converting Between Forms"
run "f03cfd0b-dc98-4230-b7b8-280bc0baeaba" "https://youtu.be/LpKfnxp8Lto"     "Linear: Graphing"
run "ca7ea1bb-06c5-46fa-aad8-d2c50192039d" "https://youtu.be/83Lj-Y7IKdw"     "Linear Functions SAT & ACT Qs"
# MATH: Systems of Equations
run "6bdef40f-3a4e-4e64-a0c8-ecc26e668267" "https://youtu.be/698_HrlBkII"     "Systems Introduction"
run "6b74f176-6388-423b-8bae-bc07912e07e7" "https://youtu.be/nL0r3CfMVS4"     "Solving Systems"
run "dd0a10b4-e970-4e4d-bf99-f4fc23b54e4c" "https://youtu.be/vAz5jVP4B50"     "Mixture Problems"
run "479cd770-fd0a-4ca4-aa05-201537905f37" "https://youtu.be/ryP7gaDHf0g"     "Systems SAT & ACT Qs"
# MATH: Function Notation
run "daa2f594-ef94-4700-820a-50e088b1051c" "https://youtu.be/ibrs1YDVhTc"     "Function Notation & Composition"
# MATH: Factoring
run "4f590416-9a64-4316-9e3b-e378b14875b2" "https://youtu.be/EL4D_Zncd3Y"     "GCF & Grouping"
run "fffc4d78-3bac-437b-9830-d156eef89f2d" "https://youtu.be/G69wnyoqAZs"     "Quadratic Equations"
run "ae264226-6437-40d9-b867-cf0e01412c61" "https://youtu.be/rKCq4r2Js2g"     "Sum & Difference of Cubes"
run "78137108-ce05-4fcb-b7af-ebc349575363" "https://youtu.be/tTKqylLKiwM"     "Factoring SAT & ACT Questions"
# MATH: Polynomial Division
run "fc7de262-1f39-4eea-a0b4-72c6981c9f6f" "https://youtu.be/vhZ1Xiqpk3c"     "Long and Synthetic Division"
run "81b2eeeb-1ecd-487a-9018-3e24fbb25edd" "https://youtu.be/egPtrXXc_Go"     "Polynomial Division SAT & ACT Qs"
# MATH: Similarity
run "92816303-762e-4242-9a90-2bd05f48f8c9" "https://youtu.be/LLsVGS_2S5Y"     "Similar Figures"
# MATH: Lines, Angles, & Triangles
run "0bfd821e-121c-4c6a-81e0-7dc76a1166be" "https://youtu.be/FuwXyDwORsg"     "Lines & Angle Relationships"
run "0c055b32-f46d-4203-abcf-c5061f1b3efe" "https://youtu.be/AdNlwk_xzOI"     "Degrees/Radians & Regular Polygons"
run "df3afad3-51a3-4cdb-b5ed-a42c6ae48b80" "https://youtu.be/euKKwJmBLAI"     "Lines & Angles SAT & ACT Questions"
run "42e2ebd2-fbbb-4079-8d79-a1e4b1ee99ed" "https://youtu.be/_aieWno-Jz8"     "Types of Triangles & Trigonometry"
run "3f3124d2-4468-4f67-bae3-5ad4c3e368e0" "https://youtu.be/4Ytmul9Sw-8"     "Special Right & Complimentary Angles"
run "bdbada09-d0f3-40a7-a63e-1c7fb11e076b" "https://youtu.be/kuDYl6zoZmY"     "Triangles SAT & ACT Questions"
# MATH: Circles
run "8ba850f8-15a2-408f-a8fa-80c9f4f25c0b" "https://youtu.be/8S6X45-Ddew"     "Area of Sector and Arc Length"
run "031b0d90-4f84-47c4-96a7-709e25141a1d" "https://youtu.be/1Ut0D_JJelM"     "Sector and Arc SAT & ACT Questions"
run "5cd058d7-1cdb-4c42-9c3b-e8ba23c5e396" "https://youtu.be/ldPDaa8mm5c"     "Standard & General Formula of Circles"
run "1a363ff7-2da3-44be-8134-411c96b65e4b" "https://youtu.be/xqLZI8ivcgE"     "Circle Formula SAT & ACT Questions"
# MATH: Parent Functions & Transformations
run "3f9de233-b93a-4cdf-8f09-c44bfddf2331" "https://youtu.be/hTssLd88kBw"     "Identifying Functions"
run "158a9350-d701-4293-a7a1-d269b7ffed5b" "https://youtu.be/kdsgX5rz-Bg"     "Parent Functions & Transformations"
run "c829d545-6958-492c-8899-2dd1dc86702e" "https://youtu.be/66SlH2UcCKE"     "Parent Functions Practice"
# MATH: Data & Statistics
run "9a2e2266-82f4-4fe2-a9af-df6805f9bd95" "https://youtu.be/0ow4ocilwWc"     "Fundamental Counting Principle"
run "be2f39cf-7ce2-4427-b3d6-4e5137d077c4" "https://youtu.be/hHvLz3SMlbA"     "Intro to Probability"
run "4c2899cc-baca-4059-ba86-53f93bb5415c" "https://youtu.be/6EqfNSxTzI8"     "AND/OR Probability"
run "986fd9b4-b6a1-4e78-9b1b-e3907ed13151" "https://youtu.be/xT1AX1hrByE"     "Mean, Median, & Mode"
run "512b7eca-3dd4-4109-ae4b-48510e376927" "https://youtu.be/kH8M0plcrGg"     "Mean Median Mode Practice"
run "d5418363-673e-43ee-8cb3-2c6dea9a251f" "https://youtu.be/r5nnTTP7wJQ"     "Correlation"
run "4a70bb91-3faa-4902-a9f0-6b613b91a495" "https://youtu.be/aIpOMLMN3Ic"     "Two-Way Frequency Tables"
run "844b6161-1b7a-4c77-acee-27eb53a0de76" "https://youtu.be/GXLwNJ6zhEo"     "FCM, Probability, & Frequency Practice"

echo "Done."
