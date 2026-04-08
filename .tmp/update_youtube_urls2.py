import json
import urllib.request
import ssl

TOKEN = "sbp_3ebe367cc322192ea80b5ae4d3a4995ce908f6fa"
URL = "https://api.supabase.com/v1/projects/jltkdbsbrnwrqxouhpgu/database/query"

updates = [
    # ENGLISH: Punctuation
    ("1cdb5f86-86da-4324-bc37-fae244b7f849", "https://youtu.be/_H8qaLY2kvM"),
    ("163e9860-223c-41f8-baf7-89d7a0b31527", "https://youtu.be/mRttqN3jILY"),
    ("ce950e3f-729f-4d4c-b9dd-2cbc2996e561", "https://youtu.be/4x2NPfQV5Uc"),
    ("6ecf7f36-bd23-47b2-a100-5eedfa6799f5", "https://youtu.be/rLSY9ZlQxpA"),
    ("c11623d0-8691-4758-ad31-15d8e32afdab", "https://youtu.be/czF0BjqT-zg"),
    ("0a8b9416-fee9-49a4-9065-cc35a2eaa00d", "https://youtu.be/TAw5rYb_DZM"),
    ("cc083a97-3726-43ce-b577-3d24815c802b", "https://youtu.be/YG7BJUyC_3U"),
    ("cc631dab-0e9e-4447-b429-4a6fd53b5d3e", "https://youtu.be/1f1HU48fr1Q"),
    ("3e16efba-199e-4617-a436-62d4f8448ad4", "https://youtu.be/8WaIbntoAJw"),
    ("55e0fe08-354c-4060-90c9-d8f102d91ef9", "https://youtu.be/J961JKMDJbQ"),
    ("919c8b95-5fb0-44b6-86d2-0796113a6bc8", "https://youtu.be/sLA4uQKVZDU"),
    ("0c6b60f4-d984-425b-b986-d30e98574516", "https://youtu.be/vuM1hfO7zmo"),
    ("cae330cd-a07f-470a-916a-4047c52498e0", "https://youtu.be/hlEv1XJuMxI"),
    # MATH: Integers
    ("ff02c41f-0b42-4a8c-9d1e-d2d70ebc6528", "https://youtu.be/Yrq1wSoutEY"),
    ("482744ef-e25c-4dff-8297-c326f0b1f661", "https://youtu.be/CL0K6ZzStNc"),
    # MATH: Fractions
    ("97c5ae9d-2b12-4c26-8e6b-c7412f9f3b43", "https://youtu.be/rINPGm3bo10"),
    ("e51ccaf6-4005-4014-8c5d-5ff9d8d2dda6", "https://youtu.be/8r5l1Y0aclM"),
    ("485239e5-4dc2-4640-8581-b5ca17248324", "https://youtu.be/9UQ4ypcboyA"),
    # MATH: Order of Operations
    ("a6daf6ba-f3e8-4231-9132-a4441e66fb84", "https://youtu.be/EXQ6nW1vEEI"),
    # MATH: Properties of Exponents & Radicals
    ("b06e016a-3d90-4b1b-892d-ddcbcaa64f78", "https://youtu.be/k5dPBZgEfsQ"),
    ("73787b8e-8977-4036-8516-1a67d809276f", "https://youtu.be/D0vQZNCRhg0"),
    ("50058d96-c3f3-4654-9e97-cf531e7fb18b", "https://youtu.be/AB2v7zHCK8k"),
    ("866d5d13-9e92-422a-a539-27a7d071e5c2", "https://youtu.be/YqKCpKQ0bGQ"),
    ("713c4bed-cf77-4236-88e8-a55039848d23", "https://youtu.be/7-SUqsZZ-yM"),
    # MATH: Complex Numbers
    ("8f0e6e91-9d7a-46a2-be28-dcd87077bf25", "https://youtu.be/SOKlgWrcbG8"),
    ("e474c9fc-ad70-4fe0-93e3-2dc4bc7372fd", "https://youtu.be/GbYzIdIO94U"),
    ("28697b29-a9a7-4b13-9437-4f7018109722", "https://youtu.be/SIYabPbmNOQ"),
    ("b82b3731-fea1-4f96-b16f-9603a4b7aa54", "https://youtu.be/oUEkb30OSew"),
    # MATH: Linear Functions
    ("4e407593-4ac0-423b-8619-dd0f0371f03b", "https://youtu.be/MdNCQBAcEU0"),
    ("f03cfd0b-dc98-4230-b7b8-280bc0baeaba", "https://youtu.be/LpKfnxp8Lto"),
    ("ca7ea1bb-06c5-46fa-aad8-d2c50192039d", "https://youtu.be/83Lj-Y7IKdw"),
    # MATH: Systems of Equations
    ("6bdef40f-3a4e-4e64-a0c8-ecc26e668267", "https://youtu.be/698_HrlBkII"),
    ("6b74f176-6388-423b-8bae-bc07912e07e7", "https://youtu.be/nL0r3CfMVS4"),
    ("dd0a10b4-e970-4e4d-bf99-f4fc23b54e4c", "https://youtu.be/vAz5jVP4B50"),
    ("479cd770-fd0a-4ca4-aa05-201537905f37", "https://youtu.be/ryP7gaDHf0g"),
    # MATH: Function Notation
    ("daa2f594-ef94-4700-820a-50e088b1051c", "https://youtu.be/ibrs1YDVhTc"),
    # MATH: Factoring
    ("4f590416-9a64-4316-9e3b-e378b14875b2", "https://youtu.be/EL4D_Zncd3Y"),
    ("fffc4d78-3bac-437b-9830-d156eef89f2d", "https://youtu.be/G69wnyoqAZs"),
    ("ae264226-6437-40d9-b867-cf0e01412c61", "https://youtu.be/rKCq4r2Js2g"),
    ("78137108-ce05-4fcb-b7af-ebc349575363", "https://youtu.be/tTKqylLKiwM"),
    # MATH: Polynomial Division
    ("fc7de262-1f39-4eea-a0b4-72c6981c9f6f", "https://youtu.be/vhZ1Xiqpk3c"),
    ("81b2eeeb-1ecd-487a-9018-3e24fbb25edd", "https://youtu.be/egPtrXXc_Go"),
    # MATH: Similarity
    ("92816303-762e-4242-9a90-2bd05f48f8c9", "https://youtu.be/LLsVGS_2S5Y"),
    # MATH: Lines, Angles, & Triangles
    ("0bfd821e-121c-4c6a-81e0-7dc76a1166be", "https://youtu.be/FuwXyDwORsg"),
    ("0c055b32-f46d-4203-abcf-c5061f1b3efe", "https://youtu.be/AdNlwk_xzOI"),
    ("df3afad3-51a3-4cdb-b5ed-a42c6ae48b80", "https://youtu.be/euKKwJmBLAI"),
    ("42e2ebd2-fbbb-4079-8d79-a1e4b1ee99ed", "https://youtu.be/_aieWno-Jz8"),
    ("3f3124d2-4468-4f67-bae3-5ad4c3e368e0", "https://youtu.be/4Ytmul9Sw-8"),
    ("bdbada09-d0f3-40a7-a63e-1c7fb11e076b", "https://youtu.be/kuDYl6zoZmY"),
    # MATH: Circles
    ("8ba850f8-15a2-408f-a8fa-80c9f4f25c0b", "https://youtu.be/8S6X45-Ddew"),
    ("031b0d90-4f84-47c4-96a7-709e25141a1d", "https://youtu.be/1Ut0D_JJelM"),
    ("5cd058d7-1cdb-4c42-9c3b-e8ba23c5e396", "https://youtu.be/ldPDaa8mm5c"),
    ("1a363ff7-2da3-44be-8134-411c96b65e4b", "https://youtu.be/xqLZI8ivcgE"),
    # MATH: Parent Functions & Transformations
    ("3f9de233-b93a-4cdf-8f09-c44bfddf2331", "https://youtu.be/hTssLd88kBw"),
    ("158a9350-d701-4293-a7a1-d269b7ffed5b", "https://youtu.be/kdsgX5rz-Bg"),
    ("c829d545-6958-492c-8899-2dd1dc86702e", "https://youtu.be/66SlH2UcCKE"),
    # MATH: Data & Statistics
    ("9a2e2266-82f4-4fe2-a9af-df6805f9bd95", "https://youtu.be/0ow4ocilwWc"),
    ("be2f39cf-7ce2-4427-b3d6-4e5137d077c4", "https://youtu.be/hHvLz3SMlbA"),
    ("4c2899cc-baca-4059-ba86-53f93bb5415c", "https://youtu.be/6EqfNSxTzI8"),
    ("986fd9b4-b6a1-4e78-9b1b-e3907ed13151", "https://youtu.be/xT1AX1hrByE"),
    ("512b7eca-3dd4-4109-ae4b-48510e376927", "https://youtu.be/kH8M0plcrGg"),
    ("d5418363-673e-43ee-8cb3-2c6dea9a251f", "https://youtu.be/r5nnTTP7wJQ"),
    ("4a70bb91-3faa-4902-a9f0-6b613b91a495", "https://youtu.be/aIpOMLMN3Ic"),
    ("844b6161-1b7a-4c77-acee-27eb53a0de76", "https://youtu.be/GXLwNJ6zhEo"),
]

def run_query(sql):
    payload = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(URL, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", "application/json")
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx) as resp:
        return resp.read().decode()

# Run as individual UPDATE statements in batches of 10
BATCH_SIZE = 10
total = 0
for i in range(0, len(updates), BATCH_SIZE):
    batch = updates[i:i+BATCH_SIZE]
    statements = "\n".join(
        f"UPDATE lessons SET youtube_url = '{url}' WHERE id = '{uid}';"
        for uid, url in batch
    )
    result = run_query(statements)
    if "error" in result.lower():
        print(f"ERROR in batch {i//BATCH_SIZE + 1}: {result}")
    else:
        total += len(batch)
        print(f"Batch {i//BATCH_SIZE + 1}: updated {len(batch)} lessons (total: {total})")

print(f"\nComplete. {total}/{len(updates)} lessons updated.")
