try:
    import cairosvg
    print("cairosvg OK", cairosvg.__version__)
except Exception as e:
    print("cairosvg FAIL:", e)

try:
    from PIL import Image
    print("PIL OK", Image.__version__)
except Exception as e:
    print("PIL FAIL:", e)