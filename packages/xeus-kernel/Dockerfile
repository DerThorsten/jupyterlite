FROM emscripten/emsdk:2.0.27


ARG USER_ID
ARG GROUP_ID

# RUN addgroup --gid $GROUP_ID user
# RUN adduser --disabled-password --gecos '' --uid $USER_ID --gid $GROUP_ID user
# USER user

# # RUN apt-get update && \
# #     apt-get install -qqy doxygen git && \
# #     mkdir -p /opt/libvpx/build && \
# #     git clone https://github.com/webmproject/libvpx /opt/libvpx/src



RUN mkdir -p /install
RUN mkdir -p /install/lib


##################################################################
# OpenSSL
##################################################################
RUN mkdir -p /opt/openssl/build && \
    git clone https://github.com/openssl/openssl.git  /opt/openssl/src


RUN cd /opt/openssl/build && \
    emconfigure ../src/Configure -no-shared -disable-shared -no-asm -no-tests -no-unit-test  -static -no-sock -no-afalgeng --prefix=/install

RUN cd /opt/openssl/build && \
    sed -i 's/.*CROSS_COMPILE=.*/CROSS_COMPILE=""/' Makefile

RUN cd /opt/openssl/build && \
    emmake make -j8

RUN cd /opt/openssl/build && \
    emmake make install_sw


##################################################################
# xtl
##################################################################
RUN mkdir -p /opt/xtl/build && \
    git clone https://github.com/xtensor-stack/xtl.git  /opt/xtl/src

RUN cd /opt/xtl/build && \
    emcmake cmake ../src/   -DCMAKE_INSTALL_PREFIX=/install

RUN cd /opt/xtl/build && \
    emmake make -j8 install


##################################################################
# nloman json
##################################################################
RUN mkdir -p /opt/nlohmannjson/build && \
    git clone https://github.com/nlohmann/json.git /opt/nlohmannjson/src

RUN cd /opt/nlohmannjson/build && \
    emcmake cmake ../src/   -DCMAKE_INSTALL_PREFIX=/install -DJSON_BuildTests=OFF

RUN cd /opt/nlohmannjson/build && \
    emmake make -j8 install


##################################################################
# xeus itself
##################################################################

#RUN mkdir -p /opt/nlohmannjson/build &&  \
#    git clone -b ems https://github.com/DerThorsten/xeus.git   /opt/xeus

COPY xeus /opt/xeus

RUN cd /install/lib && echo "LS" && ls
RUN cd /install/include && echo "LS" && ls
RUN mkdir -p /xeus-build && cd /xeus-build  && ls &&\
    emcmake cmake  /opt/xeus \
        -DCMAKE_INSTALL_PREFIX=/install \
        -Dnlohmann_json_DIR=/install/lib/cmake/nlohmann_json \
        -Dxtl_DIR=/install/share/cmake/xtl \
        -DOPENSSL_INCLUDE_DIR=/install/include \
        -DOPENSSL_CRYPTO_LIBRARY=/install/libx32/libcrypto.a \
        -DOPENSSL_SSL_LIBRARY=/install/libx32/libssl.a \
        -DOPENSSL_ROOT_DIR=/install/ \
        -DOPENSSL_USE_STATIC_LIBS=ON
RUN cd /xeus-build && \
    emmake make -j8 xeus_dummy
RUN cd /xeus-build && \
    emmake make install

##################################################################
# lua
##################################################################
RUN git clone https://github.com/DerThorsten/wasm_lua   /opt/wasm_lua
RUN cd /opt/wasm_lua && \
    emmake make


##################################################################
# xeus-lua
##################################################################

# RUN mkdir -p /opt/nlohmannjson/build &&  \
#    git clone -b main https://github.com/DerThorsten/xeus-lua.git   /opt/xeus-lua

COPY xeus-lua /opt/xeus-lua


RUN mkdir -p /xeus-lua-build && cd /xeus-lua-build  && ls && \
    emcmake cmake  /opt/xeus-lua \
        -DCMAKE_INSTALL_PREFIX=/install \
        -Dnlohmann_json_DIR=/install/lib/cmake/nlohmann_json \
        -Dxtl_DIR=/install/share/cmake/xtl \
        -DOPENSSL_INCLUDE_DIR=/install/include \
        -DOPENSSL_CRYPTO_LIBRARY=/install/libx32/libcrypto.a \
        -DOPENSSL_SSL_LIBRARY=/install/libx32/libssl.a \
        -DOPENSSL_ROOT_DIR=/install/ \
        -DOPENSSL_USE_STATIC_LIBS=ON \
        -DLUA_INCLUDE_DIR=/opt/wasm_lua/lua-5.3.4/src \
        -DLUA_LIBRARY=/opt/wasm_lua/lua-5.3.4/src/liblua.a \
        -Dxeus_DIR=/install/lib/cmake/xeus 

RUN cd /xeus-lua-build && \
    emmake make -j8 xeus_lua